import sharp from 'sharp';
import archiver from 'archiver';

export class CompressionService {
  /**
   * Compresses an image buffer with specified options.
   */
  static async compress(buffer, options = {}) {
    const {
      format = 'webp',
      quality = 88,
      maxWidth = null,
      maxHeight = null,
      fit = 'inside',
      // Enhancement Studio Options
      enhance = false,
      sharpen = 'none', // 'none' | 'light' | 'medium' | 'ultra'
      hdrContrast = false,
      vibrance = false,
      autoLevels = false,
      denoise = false,
      upscale2x = false
    } = options;

    const originalSize = buffer.length;
    let pipeline = sharp(buffer, { failOn: 'none' });

    // 1. Denoise (Grain Reduction)
    if (enhance && denoise) {
      pipeline = pipeline.median(3);
    }

    // 2. 2x HD Super-Resolution Upscaling (Lanczos3 Kernel)
    if (enhance && upscale2x) {
      const meta = await sharp(buffer).metadata();
      if (meta.width && meta.height) {
        pipeline = pipeline.resize({
          width: meta.width * 2,
          height: meta.height * 2,
          kernel: 'lanczos3'
        });
      }
    } else if (maxWidth || maxHeight) {
      // Optional normal resize if requested
      pipeline = pipeline.resize({
        width: maxWidth ? parseInt(maxWidth, 10) : undefined,
        height: maxHeight ? parseInt(maxHeight, 10) : undefined,
        fit,
        withoutEnlargement: true
      });
    }

    // 3. Studio Dynamic Tone (Natural Lighting & Shadow Recovery without ugly CLAHE blotches)
    if (enhance && hdrContrast) {
      // Gentle studio tone mapping: preserves flat walls and skin without grain
      pipeline = pipeline.modulate({ brightness: 1.02 }).linear(1.03, -2);
    }

    // 4. Auto Dynamic Levels / Contrast Stretching
    if (enhance && autoLevels) {
      pipeline = pipeline.normalise();
    }

    // 5. Vibrance & Natural Color Pop
    if (enhance && vibrance) {
      pipeline = pipeline.modulate({ saturation: 1.08, brightness: 1.01 });
    }

    // 6. Professional Studio Sharpening with Coring Threshold (Zero Halos, Zero Grain on Skin/Walls)
    if (enhance && sharpen && sharpen !== 'none') {
      if (sharpen === 'light') {
        pipeline = pipeline.sharpen({
          sigma: 0.65,
          m1: 0.04, // Flat areas (skin, walls) protected from noise
          m2: 1.1,  // Natural edge boost
          x1: 2.5,  // Noise threshold
          y2: 1.5,
          y3: 10.0
        });
      } else if (sharpen === 'medium') {
        pipeline = pipeline.sharpen({
          sigma: 0.75,
          m1: 0.06, // Flat areas protected
          m2: 1.35, // Crisp portrait definition
          x1: 2.0,
          y2: 2.0,
          y3: 14.0
        });
      } else if (sharpen === 'ultra') {
        pipeline = pipeline.sharpen({
          sigma: 0.85,
          m1: 0.08, // Never amplify flat background noise
          m2: 1.6,  // High edge clarity without white halo artifacts
          x1: 2.0,
          y2: 2.0,
          y3: 18.0
        });
      }
    }

    const cleanFormat = format.toLowerCase().replace('jpg', 'jpeg');
    const q = Math.max(1, Math.min(100, parseInt(quality, 10) || 85));
    const compEffort = options.isDownload ? 6 : 4; // Fast effort 4 for instant preview, 6 for download

    switch (cleanFormat) {
      case 'webp':
        pipeline = pipeline.webp({
          quality: q,
          effort: compEffort, // Fast effort 4 prevents server hang on 15MB+ photos
          smartSubsample: q < 85, // Preserve full chroma for high quality
          lossless: q === 100
        });
        break;
      case 'jpeg':
        pipeline = pipeline.jpeg({
          quality: q,
          mozjpeg: true, // MozJPEG psycho-visual engine
          progressive: true,
          trellisQuantisation: true, // Eliminates high-frequency noise without blurring
          overshootDeringing: true, // Prevents halo ringing around high-contrast edges
          optimizeScans: true,
          quantisationTable: 3 // ImageMagick psychovisual flat matrix
        });
        break;
      case 'png':
        pipeline = pipeline.png({
          quality: Math.max(70, q),
          compressionLevel: compEffort === 6 ? 9 : 6,
          palette: q < 95 // Palette quantization for size savings, full lossless if q >= 95
        });
        break;
      case 'avif':
        pipeline = pipeline.avif({
          quality: q,
          effort: compEffort,
          chromaSubsampling: q >= 80 ? '4:4:4' : '4:2:0' // Full color sharpness for q >= 80
        });
        break;
      default:
        pipeline = pipeline.webp({ quality: q, effort: compEffort, smartSubsample: false });
        break;
    }

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    const compressedSize = data.length;
    const percentageSaved = Math.max(0, ((originalSize - compressedSize) / originalSize) * 100);

    return {
      buffer: data,
      info,
      originalSize,
      compressedSize,
      percentageSaved: parseFloat(percentageSaved.toFixed(1)),
      mimeType: `image/${cleanFormat}`
    };
  }

  /**
   * Smart Target Size Optimizer:
   * Binary searches for the maximum quality that remains under targetSizeKB.
   */
  static async compressToTarget(buffer, targetSizeKB, format = 'webp') {
    const targetSizeBytes = targetSizeKB * 1024;
    let low = 10;
    let high = 95;
    let bestResult = null;

    // Fast 5-pass binary search for optimal visual quality within bounds
    for (let pass = 0; pass < 5; pass++) {
      const midQuality = Math.floor((low + high) / 2);
      const result = await this.compress(buffer, { format, quality: midQuality });

      if (result.compressedSize <= targetSizeBytes) {
        bestResult = result;
        low = midQuality + 1; // Try higher quality
      } else {
        high = midQuality - 1; // Needs more compression
      }
    }

    // Fallback if even quality 10 exceeds target size: resize dimensions down proportionally
    if (!bestResult || bestResult.compressedSize > targetSizeBytes) {
      const meta = await sharp(buffer).metadata();
      let scale = 0.8;
      for (let rPass = 0; rPass < 3; rPass++) {
        const result = await this.compress(buffer, {
          format,
          quality: 60,
          maxWidth: Math.floor(meta.width * scale),
          maxHeight: Math.floor(meta.height * scale)
        });
        if (result.compressedSize <= targetSizeBytes) {
          bestResult = result;
          break;
        }
        scale -= 0.2;
      }
      if (!bestResult) {
        bestResult = await this.compress(buffer, { format, quality: 30 });
      }
    }

    return bestResult;
  }
}
