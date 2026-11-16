import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { VideoController } from '../controllers/videoController.js';
import { JobStore } from '../services/jobStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../temp/uploads');
const OUTPUTS_DIR = path.join(__dirname, '../../temp/outputs');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(mp4|mkv|mov|webm|avi|ts|3gp|flv|wmv|m4v)$/i;
    if (allowed.test(file.originalname) || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files (MP4, MKV, MOV, WEBM, AVI, TS) are supported'));
    }
  }
});

const router = express.Router();

router.post('/upload', upload.single('video'), VideoController.uploadVideo);
router.post('/compress/:jobId', VideoController.compressVideo);
router.get('/progress/:jobId', VideoController.streamProgress);
router.get('/status/:jobId', VideoController.getStatus);
router.get('/download/:jobId', VideoController.downloadVideo);
router.post('/cancel/:jobId', VideoController.cancelJob);

router.get('/thumbnail/:jobId', (req, res) => {
  const job = JobStore.get(req.params.jobId);
  if (!job || !job.thumbnailPath || !fs.existsSync(job.thumbnailPath)) {
    return res.status(404).json({ error: 'Thumbnail not available' });
  }
  res.sendFile(job.thumbnailPath);
});

router.get('/stream/:jobId', (req, res) => {
  const { jobId } = req.params;
  const { type = 'compressed' } = req.query;
  const job = JobStore.get(jobId);
  if (!job) return res.status(404).send('Job not found');

  let filePath = type === 'compressed' ? job.outputPath : job.inputPath;
  if (type === 'original') {
    const originalWebPath = path.join(OUTPUTS_DIR, `original_web_${jobId}.mp4`);
    if (fs.existsSync(originalWebPath)) filePath = originalWebPath;
  }

  if (!filePath || !fs.existsSync(filePath)) return res.status(404).send('File not found');

  try {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const CHUNK_SIZE = 1024 * 1024 * 2;
      const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + CHUNK_SIZE - 1, fileSize - 1);
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      req.on('close', () => file.destroy());

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
  } catch (err) {
    res.status(500).send(err.message);
  }
});

export default router;
