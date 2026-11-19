import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

/**
 * High-Fidelity & Lossless PDF Optimization Engine for OptiPixel
 * - Preserves 100% vector text clarity and searchability
 * - Strips redundant metadata & unreferenced objects
 * - Digital Signature Guard: skips modifying signed PDFs
 * - Smart Quality Guard: preserves original if savings < 5%
 */
export async function processPdf(srcPath, destPath, settings = {}) {
  const origStat = await fs.promises.stat(srcPath);

  // Tiny files (< 30KB) have negligible savings, preserve directly
  if (origStat.size < 30 * 1024) {
    await fs.promises.copyFile(srcPath, destPath);
    return {
      size: origStat.size,
      action: 'preserved_original',
      method: 'too_small',
      bytesSaved: 0
    };
  }

  const rawBytes = await fs.promises.readFile(srcPath);
  const rawStr = rawBytes.toString('binary');

  // 1. Digital Signature Guard: Never modify signed legal/financial documents
  if (rawStr.includes('/ByteRange') && rawStr.includes('/Contents')) {
    await fs.promises.copyFile(srcPath, destPath);
    return {
      size: origStat.size,
      action: 'preserved_original',
      method: 'digitally_signed_preserved',
      bytesSaved: 0
    };
  }

  // 2. Encryption / Password Guard
  if (rawStr.includes('/Encrypt')) {
    await fs.promises.copyFile(srcPath, destPath);
    return {
      size: origStat.size,
      action: 'preserved_original',
      method: 'encrypted_preserved',
      bytesSaved: 0
    };
  }

  try {
    const pdfDoc = await PDFDocument.load(rawBytes, {
      ignoreEncryption: true,
      parseSpeed: 1000
    });

    // Strip unneeded metadata
    try {
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('OptiPixel Clean Engine');
      pdfDoc.setCreator('OptiPixel');
    } catch (e) {}

    // Save with object stream compression and clean xref table
    const optimizedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 100
    });

    // Smart Quality Guard: Only save if at least 5% savings achieved
    if (optimizedBytes.length < origStat.size * 0.95) {
      await fs.promises.writeFile(destPath, optimizedBytes);
      return {
        size: optimizedBytes.length,
        action: 'compressed',
        method: 'stream_optimized',
        bytesSaved: origStat.size - optimizedBytes.length
      };
    } else {
      // Already optimal, keep pristine original
      await fs.promises.copyFile(srcPath, destPath);
      return {
        size: origStat.size,
        action: 'preserved_original',
        method: 'already_optimal',
        bytesSaved: 0
      };
    }
  } catch (err) {
    // Safe Fallback: Pristine original copy on any parsing anomaly
    try {
      await fs.promises.copyFile(srcPath, destPath);
    } catch (copyErr) {}

    return {
      size: origStat.size,
      action: 'preserved_original',
      method: 'safe_fallback_original',
      bytesSaved: 0
    };
  }
}
