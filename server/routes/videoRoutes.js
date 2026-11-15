import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { VideoCompressionService } from '../services/videoCompressionService.js';
import { OptimizationLog } from '../models/OptimizationLog.js';
import { JobStore } from '../services/jobStore.js';
import { FolderBatchService } from '../services/folderBatchService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '../temp/uploads');
const OUTPUTS_DIR = path.join(__dirname, '../temp/outputs');

// Ensure directories exist
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

// Disk storage for videos (up to 500MB)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10 GB limit (Supports 4K movies & raw footage without RAM bloat)
  fileFilter: (req, file, cb) => {
    const allowed = /\.(mp4|mkv|mov|webm|avi|ts|3gp|flv|wmv|m4v)$/i;
    if (allowed.test(file.originalname) || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files (MP4, MKV, MOV, WEBM, AVI, TS) are supported'));
    }
  }
});

// Helper to log stats to DB cleanly
const safeLogStats = async (logData) => {
  try {
    const originalSize = logData.originalSize || logData.originalBytes || 0;
    const compressedSize = logData.compressedSize || logData.compressedBytes || 0;
    const bytesSaved = Math.max(0, originalSize - compressedSize);
    const percentageSaved = originalSize > 0 ? parseFloat((((originalSize - compressedSize) / originalSize) * 100).toFixed(1)) : 0;
    const timeTakenMs = logData.timeTakenMs || 2500;

    await OptimizationLog.create({
      originalName: logData.originalName || 'video',
      relativePath: logData.relativePath || '',
      format: (logData.format || 'mp4').toLowerCase(),
      module: logData.module || 'video_studio',
      status: logData.status || 'optimized',
      originalSize,
      compressedSize,
      bytesSaved,
      percentageSaved,
      timeTakenMs
    });
  } catch (err) {
    // Non-blocking offline fallback
  }
};

/**
 * 1. Upload Video & Probe Metadata
 */
router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const inputPath = req.file.path;
    const metadata = await VideoCompressionService.getVideoMetadata(inputPath);

    const jobId = crypto.randomUUID();
    const job = {
      id: jobId,
      status: 'queued',
      progress: 0,
      fps: 0,
      speed: '1x',
      timeRemainingSec: 0,
      originalName: req.file.originalname,
      inputPath,
      outputPath: null,
      thumbnailPath: null,
      metadata,
      result: null,
      error: null,
      createdAt: Date.now()
    };

    const thumbFilename = `thumb_${jobId}.jpg`;
    const thumbnailPath = path.join(OUTPUTS_DIR, thumbFilename);
    await VideoCompressionService.generateThumbnail(inputPath, thumbnailPath);
    if (fs.existsSync(thumbnailPath)) {
      job.thumbnailPath = thumbnailPath;
    }

    // If original video uses a legacy/non-web codec (e.g. raw MPEG-4 mp4v), prepare web-compatible original
    const nonWebCodecs = ['mpeg4', 'mp4v', 'wmv', 'avi', 'mpeg2video', 'mjpeg'];
    if (nonWebCodecs.includes(metadata.codec?.toLowerCase())) {
      const originalWebPath = path.join(OUTPUTS_DIR, `original_web_${jobId}.mp4`);
      // Start in background without blocking upload response
      VideoCompressionService.createWebCompatibleOriginal(inputPath, originalWebPath)
        .then((ok) => {
          if (ok) console.log(`🎬 Web-compatible original stream ready for ${jobId}`);
        })
        .catch(() => {});
    }

    JobStore.set(jobId, job);

    res.json({
      success: true,
      jobId,
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
      sizeMB: metadata.sizeMB,
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      fps: metadata.fps,
      codec: metadata.codec,
      hasAudio: metadata.hasAudio,
      thumbnailUrl: job.thumbnailPath ? `/api/video/thumbnail/${jobId}` : null
    });
  } catch (error) {
    console.error('Video upload error:', error);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ error: 'Failed to process uploaded video', details: error.message });
  }
});

/**
 * 2. Start Video Compression Job
 */
router.post('/compress/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const job = JobStore.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // If already processing with the exact same options, avoid redundant restart
  const options = req.body || {};
  if (job.status === 'processing') {
    if (job.currentOptions && JSON.stringify(job.currentOptions) === JSON.stringify(options)) {
      return res.json({ success: true, message: 'Job already processing with current settings', jobId });
    }
    if (job.activeProcess) {
      try {
        job.activeProcess.kill();
      } catch (e) {}
      job.activeProcess = null;
    }
  }
  job.currentOptions = options;
  const ext = options.codec === 'libvpx-vp9' ? '.webm' : '.mp4';
  const outFilename = `optipixel_${jobId}${ext}`;
  const outputPath = path.join(OUTPUTS_DIR, outFilename);

  job.outputPath = outputPath;
  job.status = 'processing';
  job.progress = 1;
  job.error = null;
  JobStore.set(jobId, job);

  if (!job.inputPath || !fs.existsSync(job.inputPath)) {
    // Attempt auto-recovery from uploads directory (match newest video)
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR).filter((f) => /\.(mp4|mkv|mov|webm)$/i.test(f));
      if (files.length > 0) {
        files.sort((a, b) => fs.statSync(path.join(UPLOADS_DIR, b)).mtimeMs - fs.statSync(path.join(UPLOADS_DIR, a)).mtimeMs);
        job.inputPath = path.join(UPLOADS_DIR, files[0]);
        JobStore.set(jobId, job);
      }
    }
  }

  if (!job.inputPath || !fs.existsSync(job.inputPath)) {
    job.status = 'failed';
    job.error = 'Source video file missing on server. Please upload again.';
    JobStore.set(jobId, job);
    return res.status(400).json({ error: 'Source video file missing on server. Please upload again.' });
  }

  // Asynchronously execute compression
  VideoCompressionService.compressVideo({
    inputPath: job.inputPath,
    outputPath,
    options,
    metadata: job.metadata,
    onProcess: (proc) => {
      job.activeProcess = proc;
    },
    onProgress: (prog) => {
      job.progress = prog.percent;
      job.fps = prog.fps || 0;
      job.speed = prog.speed || '1x';
      job.timeRemainingSec = prog.timeRemainingSec || 0;
      JobStore.set(jobId, job);
    }
  })
    .then((result) => {
      job.activeProcess = null;
      job.status = 'completed';
      job.progress = 100;
      job.result = result;
      JobStore.set(jobId, job);

      safeLogStats({
        originalName: job.originalName,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        percentageSaved: result.percentageSaved,
        format: ext.replace('.', ''),
        dimensions: { width: job.metadata?.width || 1920, height: job.metadata?.height || 1080 },
        ipAddress: req.ip
      });
    })
    .catch((err) => {
      job.activeProcess = null;
      if (err.message === 'CANCELLED') {
        console.log(`[Job ${jobId}]: Previous process cancelled for new preset.`);
        return;
      }
      console.error(`[Job ${jobId} Failed]:`, err.message);
      job.status = 'failed';
      job.error = err.message;
      JobStore.set(jobId, job);
    });

  res.json({
    status: 'started',
    jobId,
    message: 'Compression pipeline started'
  });
});

/**
 * 3. Real-Time Server-Sent Events (SSE) Progress Stream
 */
router.get('/progress/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = JobStore.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.flushHeaders();

  const sendProgress = () => {
    const current = JobStore.get(jobId) || job;
    const payload = {
      jobId: current.id,
      status: current.status,
      progress: current.progress,
      fps: current.fps,
      speed: current.speed,
      timeRemainingSec: current.timeRemainingSec,
      result: current.result,
      error: current.error
    };
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  sendProgress();

  const intervalId = setInterval(() => {
    sendProgress();
    const current = JobStore.get(jobId);
    if (current && (current.status === 'completed' || current.status === 'failed')) {
      clearInterval(intervalId);
      res.end();
    }
  }, 350);

  req.on('close', () => {
    clearInterval(intervalId);
  });
});

/**
 * 4. Polling Fallback Status
 */
router.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = JobStore.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    fps: job.fps,
    speed: job.speed,
    timeRemainingSec: job.timeRemainingSec,
    result: job.result,
    error: job.error
  });
});

/**
 * 4.5. Instant Poster Thumbnail (With Instant Disk Fallback)
 */
router.get('/thumbnail/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const thumbFilename = `thumb_${jobId}.jpg`;
  const thumbnailPath = path.join(OUTPUTS_DIR, thumbFilename);

  // Fast Path: If thumbnail file is on disk, serve it immediately!
  if (fs.existsSync(thumbnailPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    return res.sendFile(path.resolve(thumbnailPath));
  }

  const job = JobStore.get(jobId);
  if (job && job.inputPath && fs.existsSync(job.inputPath)) {
    await VideoCompressionService.generateThumbnail(job.inputPath, thumbnailPath);
    job.thumbnailPath = thumbnailPath;
    JobStore.set(jobId, job);
    if (fs.existsSync(thumbnailPath)) {
      res.setHeader('Content-Type', 'image/jpeg');
      return res.sendFile(path.resolve(thumbnailPath));
    }
  }

  return res.status(404).send('No thumbnail available');
});

/**
 * 5. Video Stream with HTTP 206 Partial Content Support
 */
router.get('/stream/:jobId', (req, res) => {
  const { jobId } = req.params;
  const { type = 'compressed' } = req.query;
  const job = JobStore.get(jobId);

  let filePath = null;
  if (type === 'compressed') {
    const directDiskOut = path.join(OUTPUTS_DIR, `optipixel_${jobId}.mp4`);
    if (fs.existsSync(directDiskOut)) {
      filePath = directDiskOut;
    } else if (job?.outputPath && fs.existsSync(job.outputPath)) {
      filePath = job.outputPath;
    }
  } else {
    // If a web-streamable transcode exists for the original video (e.g. for non-native codecs like mpeg4/mp4v), prefer it!
    const originalWebFile = path.join(OUTPUTS_DIR, `original_web_${jobId}.mp4`);
    if (fs.existsSync(originalWebFile)) {
      filePath = originalWebFile;
    } else {
      filePath = job?.inputPath;
    }
  }

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Video file not ready' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4'
    });

    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4'
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

/**
 * 6. Download Final Compressed Video
 */
router.get('/download/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = JobStore.get(jobId);

  let targetPath = job?.outputPath;
  if (!targetPath || !fs.existsSync(targetPath)) {
    const direct = path.join(OUTPUTS_DIR, `optipixel_${jobId}.mp4`);
    if (fs.existsSync(direct)) targetPath = direct;
  }

  if (!targetPath || !fs.existsSync(targetPath)) {
    return res.status(404).json({ error: 'File not found or not ready' });
  }

  const originalParsed = path.parse(job?.originalName || 'video.mp4');
  const outExt = path.extname(targetPath);
  const downloadName = `${originalParsed.name}_optimized${outExt}`;

  res.download(targetPath, downloadName);
});

// Background Garbage Collector: Cleans up files older than 45 minutes
setInterval(() => {
  const now = Date.now();
  const maxAge = 45 * 60 * 1000;

  for (const job of JobStore.getAll()) {
    if (now - job.createdAt > maxAge) {
      if (job.inputPath && fs.existsSync(job.inputPath)) {
        try { fs.unlinkSync(job.inputPath); } catch (e) {}
      }
      if (job.outputPath && fs.existsSync(job.outputPath)) {
        try { fs.unlinkSync(job.outputPath); } catch (e) {}
      }
      JobStore.delete(job.id);
    }
  }
}, 15 * 60 * 1000);

export default router;
