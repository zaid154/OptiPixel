import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import os from 'os';

sharp.cache({ memory: 128, files: 50, items: 200 });
try {
  sharp.concurrency(Math.max(2, os.cpus().length || 4));
} catch (e) {}

export async function processImage(srcPath, destPath, settings) {
  const buffer = await fs.promises.readFile(srcPath);
  let pipeline = sharp(buffer, { failOn: 'none' });
  const origMeta = await pipeline.metadata().catch(() => ({}));

  if (settings.preserveExif) {
    pipeline = pipeline.withMetadata();
  }

  const q = Math.max(70, Math.min(100, parseInt(settings.imageQuality || 90, 10)));

  if (settings.imageFormat === 'webp') {
    pipeline = pipeline.webp({
      quality: q,
      effort: 2,
      smartSubsample: q < 85
    });
  } else {
    const ext = path.extname(srcPath).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') {
      pipeline = pipeline.jpeg({
        quality: q,
        mozjpeg: true,
        progressive: true,
        trellisQuantisation: true,
        overshootDeringing: true
      });
    } else if (ext === '.png') {
      pipeline = pipeline.png({
        compressionLevel: 7,
        palette: q < 92
      });
    } else if (ext === '.avif') {
      pipeline = pipeline.avif({
        quality: q,
        effort: 2,
        chromaSubsampling: q >= 85 ? '4:4:4' : '4:2:0'
      });
    } else {
      pipeline = pipeline.webp({ quality: q, effort: 2 });
    }
  }

  const tempDest = `${destPath}.tmp_${Date.now()}`;
  await pipeline.toFile(tempDest);
  const tempStat = await fs.promises.stat(tempDest);

  const savedPercent = ((buffer.length - tempStat.size) / buffer.length) * 100;
  const minSavings = settings.minSavingsPercent !== undefined ? settings.minSavingsPercent : 12;

  // Safeguard: Never replace if larger or if savings are insignificant under quality guard
  if (tempStat.size >= buffer.length || (settings.smartQualityGuard && savedPercent < minSavings)) {
    if (fs.existsSync(tempDest)) await fs.promises.unlink(tempDest).catch(() => {});
    await fs.promises.copyFile(srcPath, destPath);
    const st = await fs.promises.stat(destPath);
    return {
      size: st.size,
      action: 'preserved_original',
      width: origMeta.width || 0,
      height: origMeta.height || 0,
      format: settings.imageFormat || 'original'
    };
  }

  if (fs.existsSync(destPath)) await fs.promises.unlink(destPath).catch(() => {});
  await fs.promises.rename(tempDest, destPath);
  return {
    size: tempStat.size,
    action: 'compressed',
    width: origMeta.width || 0,
    height: origMeta.height || 0,
    format: settings.imageFormat || 'webp'
  };
}
