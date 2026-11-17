import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { VideoCompressionService } from '../services/video/videoCompressionService.js';
import { JobStore } from '../services/jobStore.js';
import { OptimizationLog } from '../models/OptimizationLog.js';
import { withDbRetry } from '../utils/dbRetryQueue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUTS_DIR = path.join(__dirname, '../../temp/outputs');
fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

export class VideoController {
  static async uploadVideo(req, res) {
    try {
      if (!req.file) return res.status(400).json({ error: 'No video file uploaded' });

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
      if (fs.existsSync(thumbnailPath)) job.thumbnailPath = thumbnailPath;

      const nonWebCodecs = ['mpeg4', 'mp4v', 'wmv', 'avi', 'mpeg2video', 'mjpeg'];
      if (nonWebCodecs.includes(metadata.codec?.toLowerCase())) {
        const originalWebPath = path.join(OUTPUTS_DIR, `original_web_${jobId}.mp4`);
        VideoCompressionService.createWebCompatibleOriginal(inputPath, originalWebPath).catch(() => {});
      }

      JobStore.set(jobId, job);

      res.json({
        jobId,
        originalName: req.file.originalname,
        ...metadata,
        thumbnailUrl: job.thumbnailPath ? `/api/video/thumbnail/${jobId}` : null
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to inspect video', details: err.message });
    }
  }

  static async compressVideo(req, res) {
    const { jobId } = req.params;
    const job = JobStore.get(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found or expired' });

    const options = req.body || {};
    const ext = options.codec === 'libvpx-vp9' ? '.webm' : '.mp4';
    const outputFilename = `optipixel_${jobId}${ext}`;
    const outputPath = path.join(OUTPUTS_DIR, outputFilename);

    JobStore.update(jobId, { status: 'processing', progress: 1, outputPath });

    VideoCompressionService.compressVideo({
      inputPath: job.inputPath,
      outputPath,
      options,
      metadata: job.metadata,
      onProgress: (prog) => {
        JobStore.update(jobId, {
          progress: prog.percent,
          fps: prog.fps,
          speed: prog.speed,
          timeRemainingSec: prog.timeRemainingSec
        });
      },
      onProcess: (proc) => {
        job.activeProcess = proc;
      }
    }).then((result) => {
      JobStore.update(jobId, { status: 'completed', progress: 100, result });
      withDbRetry(() => OptimizationLog.create({
        originalName: job.originalName || 'video',
        relativePath: job.inputPath || '',
        format: (options.codec === 'libvpx-vp9' ? 'webm' : 'mp4'),
        module: 'video_studio',
        status: 'optimized',
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        bytesSaved: Math.max(0, result.originalSize - result.compressedSize),
        percentageSaved: result.percentageSaved,
        timeTakenMs: 2000
      }), '[DB] videoController success encode').catch((e) => console.error('[DB] videoController save failed:', e.message));
    }).catch((err) => {
      const isCancelled = err.message === 'CANCELLED';
      const status = isCancelled ? 'cancelled' : 'failed';
      JobStore.update(jobId, { status, error: isCancelled ? 'User cancelled encoding' : err.message });
      withDbRetry(() => OptimizationLog.create({
        originalName: job.originalName || 'video',
        relativePath: job.inputPath || '',
        format: (options.codec === 'libvpx-vp9' ? 'webm' : 'mp4'),
        module: 'video_studio',
        status,
        originalSize: job.fileSize || 0,
        compressedSize: 0,
        bytesSaved: 0,
        percentageSaved: '0%',
        timeTakenMs: 0
      }), '[DB] videoController failed/cancelled encode').catch((e) => console.error('[DB] videoController save failed:', e.message));
    });

    res.json({ status: 'started', jobId });
  }

  static streamProgress(req, res) {
    const { jobId } = req.params;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const interval = setInterval(() => {
      const job = JobStore.get(jobId);
      if (!job) {
        res.write(`data: ${JSON.stringify({ status: 'not_found' })}\n\n`);
        clearInterval(interval);
        return res.end();
      }

      res.write(`data: ${JSON.stringify({
        status: job.status,
        progress: job.progress || 0,
        fps: job.fps || 0,
        speed: job.speed || '1x',
        timeRemainingSec: job.timeRemainingSec || 0,
        result: job.result,
        error: job.error
      })}\n\n`);

      if (['completed', 'failed', 'cancelled'].includes(job.status)) {
        clearInterval(interval);
        res.end();
      }
    }, 400);

    req.on('close', () => clearInterval(interval));
  }

  static getStatus(req, res) {
    const { jobId } = req.params;
    const job = JobStore.get(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error
    });
  }

  static downloadVideo(req, res) {
    const { jobId } = req.params;
    const job = JobStore.get(jobId);
    if (!job || !job.outputPath || !fs.existsSync(job.outputPath)) {
      return res.status(404).json({ error: 'Compressed video not available' });
    }
    const filename = `optipixel_${job.originalName || 'video.mp4'}`;
    res.download(job.outputPath, filename);
  }

  static cancelJob(req, res) {
    const { jobId } = req.params;
    const job = JobStore.get(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (job.activeProcess) {
      try { job.activeProcess.kill('SIGKILL'); } catch (e) {}
    }
    JobStore.update(jobId, { status: 'cancelled' });
    res.json({ status: 'cancelled', jobId });
  }
}
