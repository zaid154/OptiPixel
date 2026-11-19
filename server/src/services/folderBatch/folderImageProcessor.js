import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import os from 'os';

sharp.cache({ memory: 256, files: 50, items: 200 });
try {
  sharp.concurrency(Math.max(2, os.cpus().length || 4));
} catch (e) {}

export async function processImage(srcPath, destPath, settings = {}) {
  let tempDest = null;
  try {
    const srcStat = await fs.promises.stat(srcPath);
    const origSize = srcStat.size;

    // Use libvips sequentialRead tile streaming directly on file path (avoids duplicating 200MB buffers in Node)
    let pipeline = sharp(srcPath, { failOn: 'none', sequentialRead: true, limitInputPixels: 250000000 });
    const origMeta = await pipeline.metadata().catch(() => ({}));

    const origW = origMeta.width || 0;
    const origH = origMeta.height || 0;
    const pixels = origW * origH;
    const isUltraRes = pixels >= 33000000 || origSize >= 15000000;
    const ultraResInfo = isUltraRes ? {
      isUltraRes: true,
      megapixels: pixels > 0 ? (pixels / 1e6).toFixed(1) : 'High-Res',
      dims: origW && origH ? `${origW}x${origH}` : 'Ultra-HD'
    } : null;

    // Smart Resolution Cap (e.g. 4K Cap at 3840px vs Keep 64MP Original)
    if (settings.resolutionCap === '4k' && (origW > 3840 || origH > 3840)) {
      pipeline = pipeline.resize({
        width: 3840,
        height: 3840,
        fit: 'inside',
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3
      });
    } else if (settings.resolutionCap === '2k' && (origW > 1920 || origH > 1920)) {
      pipeline = pipeline.resize({
        width: 1920,
        height: 1920,
        fit: 'inside',
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3
      });
    }

    if (settings.preserveExif !== false) {
      pipeline = pipeline.withMetadata();
    }

    const q = Math.max(75, Math.min(100, parseInt(settings.imageQuality || 96, 10)));

    if (settings.imageFormat === 'webp') {
      pipeline = pipeline.webp({
        quality: q,
        effort: 4,
        nearLossless: q >= 90,
        smartSubsample: false
      });
    } else {
      const ext = path.extname(srcPath).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg') {
        pipeline = pipeline.jpeg({
          quality: q,
          mozjpeg: true,
          progressive: true,
          chromaSubsampling: '4:4:4',
          trellisQuantisation: false,
          overshootDeringing: false,
          optimiseScans: true
        });
      } else if (ext === '.png') {
        pipeline = pipeline.png({
          compressionLevel: 8,
          effort: 7,
          palette: false
        });
      } else if (ext === '.avif') {
        pipeline = pipeline.avif({
          quality: q,
          effort: 4,
          chromaSubsampling: '4:4:4'
        });
      } else {
        pipeline = pipeline.webp({ quality: q, effort: 4, nearLossless: q >= 90 });
      }
    }

    tempDest = `${destPath}.tmp_${Date.now()}`;
    await pipeline.toFile(tempDest);
    const tempStat = await fs.promises.stat(tempDest);

    const savedPercent = ((origSize - tempStat.size) / origSize) * 100;
    const minSavings = settings.minSavingsPercent !== undefined ? settings.minSavingsPercent : 10;

    if (tempStat.size >= origSize || (settings.smartQualityGuard && savedPercent < minSavings)) {
      if (fs.existsSync(tempDest)) await fs.promises.unlink(tempDest).catch(() => {});
      await fs.promises.copyFile(srcPath, destPath);
      const st = await fs.promises.stat(destPath);
      return {
        size: st.size,
        action: 'preserved_original',
        width: origW,
        height: origH,
        format: settings.imageFormat || 'original',
        ultraResInfo
      };
    }

    if (fs.existsSync(destPath)) await fs.promises.unlink(destPath).catch(() => {});
    await fs.promises.rename(tempDest, destPath);
    return {
      size: tempStat.size,
      action: 'compressed',
      width: origW,
      height: origH,
      format: settings.imageFormat || 'original',
      ultraResInfo
    };
  } catch (err) {
    // Clean up temp file if created
    if (tempDest && fs.existsSync(tempDest)) {
      await fs.promises.unlink(tempDest).catch(() => {});
    }

    // Graceful fallback for corrupted, multiband, or unsupported image formats (e.g. malformed TIFF)
    console.warn(`[FolderImageProcessor] Safe Fallback for "${path.basename(srcPath)}": ${err.message}. Copying raw original file.`);
    await fs.promises.copyFile(srcPath, destPath).catch(() => {});
    const st = await fs.promises.stat(destPath).catch(() => ({ size: 0 }));
    return {
      size: st.size,
      action: 'preserved_original',
      width: 0,
      height: 0,
      format: 'original_copy',
      fallback: true,
      ultraResInfo: null
    };
  }
}
