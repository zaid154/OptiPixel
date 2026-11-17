import archiver from 'archiver';
import path from 'path';
import crypto from 'crypto';
import { CompressionService } from '../services/compressionService.js';
import { OptimizationLog } from '../models/OptimizationLog.js';
import { withDbRetry } from '../utils/dbRetryQueue.js';

const imageBufferCache = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [id, item] of imageBufferCache.entries()) {
    if (now - item.timestamp > 30 * 60 * 1000) {
      imageBufferCache.delete(id);
    }
  }
}, 10 * 60 * 1000);

const safeLogStats = async (logData) => {
  try {
    const originalSize = logData.originalSize || 0;
    const compressedSize = logData.compressedSize || 0;
    const bytesSaved = Math.max(0, originalSize - compressedSize);
    const percentageSaved = originalSize > 0 ? parseFloat((((originalSize - compressedSize) / originalSize) * 100).toFixed(1)) : 0;

    await withDbRetry(() => OptimizationLog.create({
      originalName: logData.originalName || 'image',
      relativePath: logData.relativePath || '',
      format: (logData.format || 'webp').toLowerCase(),
      module: logData.module || 'image_studio',
      status: 'optimized',
      originalSize,
      compressedSize,
      bytesSaved,
      percentageSaved,
      timeTakenMs: 150
    }), '[DB] compressController safeLogStats');
  } catch (err) {
    console.error('[DB] compressController safeLogStats failed:', err.message);
  }
};

export class CompressController {
  static async compressSingle(req, res) {
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
        cached.timestamp = Date.now();
      } else {
        return res.status(400).json({ error: 'No image uploaded or session expired' });
      }

      const {
        format = 'webp', quality = 88, maxWidth, maxHeight,
        enhance, sharpen, hdrContrast, vibrance, autoLevels, denoise, upscale2x, isDownload
      } = req.body;

      const result = await CompressionService.compress(imageBuffer, {
        format,
        quality: parseInt(quality, 10) || 88,
        maxWidth, maxHeight,
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

      await safeLogStats({
        originalName,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        percentageSaved: result.percentageSaved,
        format
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
      return res.status(500).json({ error: 'Failed to compress image', details: error.message });
    }
  }

  static async compressTargetSize(req, res) {
    try {
      if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

      const { targetKB = 500, format = 'webp' } = req.body;
      const result = await CompressionService.compressToTarget(req.file.buffer, parseInt(targetKB, 10), format);
      const ext = format.toLowerCase().replace('jpeg', 'jpg');
      const baseName = path.parse(req.file.originalname).name;
      const outputFilename = `${baseName}_under_${targetKB}KB.${ext}`;

      await safeLogStats({
        originalName: req.file.originalname,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        percentageSaved: result.percentageSaved,
        format
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
      return res.status(500).json({ error: 'Failed to reach target size', details: error.message });
    }
  }

  static async compressBatch(req, res) {
    try {
      if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No images uploaded' });

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

          await safeLogStats({
            originalName: file.originalname,
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            percentageSaved: result.percentageSaved,
            format,
            module: 'batch_archive'
          });
        } catch (err) {
          console.error('[DB] compressController batch item save failed:', err.message);
        }
      }
      await archive.finalize();
    } catch (error) {
      return res.status(500).json({ error: 'Batch compression failed' });
    }
  }
}
