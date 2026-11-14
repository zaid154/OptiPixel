import express from 'express';
import multer from 'multer';
import archiver from 'archiver';
import path from 'path';
import crypto from 'crypto';
import { CompressionService } from '../services/compressionService.js';
import { OptimizationLog } from '../models/OptimizationLog.js';

const router = express.Router();

// In-memory buffer cache for sub-second live tweaks without re-uploading large 15MB+ photos
const imageBufferCache = new Map();

// Periodic GC for cache entries older than 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, item] of imageBufferCache.entries()) {
    if (now - item.timestamp > 30 * 60 * 1000) {
      imageBufferCache.delete(id);
    }
  }
}, 10 * 60 * 1000);

// 50MB file size limit with memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Helper to log stats to DB safely (without blocking or failing if DB offline)
const safeLogStats = async (logData) => {
  try {
    await OptimizationLog.create(logData);
  } catch (err) {
    // Non-blocking log failure
  }
};

/**
 * Single Image Compression with Instant Session Cache
 */
router.post('/single', upload.single('image'), async (req, res) => {
  try {
    let imageBuffer = null;
    let originalName = 'photo.jpg';
    let sessionImageId = req.body.sessionImageId;

    if (req.file) {
      imageBuffer = req.file.buffer;
      originalName = req.file.originalname;
      sessionImageId = crypto.randomUUID();
      imageBufferCache.set(sessionImageId, {
        buffer: imageBuffer,
        originalname: originalName,
        timestamp: Date.now()
      });
    } else if (sessionImageId && imageBufferCache.has(sessionImageId)) {
      const cached = imageBufferCache.get(sessionImageId);
      imageBuffer = cached.buffer;
      originalName = cached.originalname;
      cached.timestamp = Date.now(); // bump TTL
    } else {
      return res.status(400).json({ error: 'No image uploaded or session expired' });
    }

    const {
      format = 'webp',
      quality = 88,
      maxWidth,
      maxHeight,
      enhance,
      sharpen,
      hdrContrast,
      vibrance,
      autoLevels,
      denoise,
      upscale2x,
      isDownload
    } = req.body;

    const result = await CompressionService.compress(imageBuffer, {
      format,
      quality: parseInt(quality, 10) || 88,
      maxWidth,
      maxHeight,
      enhance: enhance === 'true' || enhance === true,
      sharpen: sharpen || 'none',
      hdrContrast: hdrContrast === 'true' || hdrContrast === true,
      vibrance: vibrance === 'true' || vibrance === true,
      autoLevels: autoLevels === 'true' || autoLevels === true,
      denoise: denoise === 'true' || denoise === true,
      upscale2x: upscale2x === 'true' || upscale2x === true,
      isDownload: isDownload === 'true' || isDownload === true
    });

    const ext = format.toLowerCase().replace('jpeg', 'jpg');
    const baseName = path.parse(originalName).name;
    const outputFilename = `${baseName}_optimized.${ext}`;

    safeLogStats({
      originalName,
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      percentageSaved: result.percentageSaved,
      format,
      dimensions: { width: result.info.width, height: result.info.height },
      ipAddress: req.ip
    });

    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${outputFilename}"`,
      'X-Original-Size': result.originalSize,
      'X-Compressed-Size': result.compressedSize,
      'X-Saved-Percent': result.percentageSaved,
      'X-Image-Width': result.info.width,
      'X-Image-Height': result.info.height,
      'X-Session-Image-Id': sessionImageId,
      'Access-Control-Expose-Headers': 'X-Original-Size, X-Compressed-Size, X-Saved-Percent, X-Image-Width, X-Image-Height, X-Session-Image-Id, Content-Disposition'
    });

    return res.send(result.buffer);
  } catch (error) {
    console.error('Compression error:', error);
    return res.status(500).json({ error: 'Failed to compress image', details: error.message });
  }
});

/**
 * Smart Target Size Compression (e.g. Exactly Under 200KB or 500KB)
 */
router.post('/target-size', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const { targetKB = 500, format = 'webp' } = req.body;
    const result = await CompressionService.compressToTarget(
      req.file.buffer,
      parseInt(targetKB, 10),
      format
    );

    const ext = format.toLowerCase().replace('jpeg', 'jpg');
    const baseName = path.parse(req.file.originalname).name;
    const outputFilename = `${baseName}_under_${targetKB}KB.${ext}`;

    safeLogStats({
      originalName: req.file.originalname,
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      percentageSaved: result.percentageSaved,
      format,
      dimensions: { width: result.info.width, height: result.info.height },
      ipAddress: req.ip
    });

    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${outputFilename}"`,
      'X-Original-Size': result.originalSize,
      'X-Compressed-Size': result.compressedSize,
      'X-Saved-Percent': result.percentageSaved,
      'X-Image-Width': result.info.width,
      'X-Image-Height': result.info.height,
      'Access-Control-Expose-Headers': 'X-Original-Size, X-Compressed-Size, X-Saved-Percent, X-Image-Width, X-Image-Height, Content-Disposition'
    });

    return res.send(result.buffer);
  } catch (error) {
    console.error('Target compression error:', error);
    return res.status(500).json({ error: 'Failed to reach target size', details: error.message });
  }
});

/**
 * Batch Compression & ZIP Download
 */
router.post('/batch', upload.array('images', 30), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    const { format = 'webp', quality = 80 } = req.body;
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="OptiPixel_Batch_Optimized.zip"'
    });

    archive.pipe(res);

    for (const file of req.files) {
      try {
        const result = await CompressionService.compress(file.buffer, { format, quality });
        const ext = format.toLowerCase().replace('jpeg', 'jpg');
        const baseName = path.parse(file.originalname).name;
        archive.append(result.buffer, { name: `${baseName}.${ext}` });

        safeLogStats({
          originalName: file.originalname,
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          percentageSaved: result.percentageSaved,
          format,
          dimensions: { width: result.info.width, height: result.info.height },
          ipAddress: req.ip
        });
      } catch (err) {
        console.warn(`Failed to process ${file.originalname}:`, err.message);
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Batch error:', error);
    return res.status(500).json({ error: 'Batch compression failed' });
  }
});

export default router;
