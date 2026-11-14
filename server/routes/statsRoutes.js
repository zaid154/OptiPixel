import express from 'express';
import { OptimizationLog } from '../models/OptimizationLog.js';

const router = express.Router();

/**
 * Get Global Compression Stats
 */
router.get('/summary', async (req, res) => {
  try {
    const stats = await OptimizationLog.aggregate([
      {
        $group: {
          _id: null,
          totalImages: { $sum: 1 },
          totalOriginalBytes: { $sum: '$originalSize' },
          totalCompressedBytes: { $sum: '$compressedSize' },
          avgSavedPercent: { $avg: '$percentageSaved' }
        }
      }
    ]);

    if (!stats || stats.length === 0) {
      return res.json({
        totalImages: 0,
        totalBytesSaved: 0,
        totalMBSaved: 0,
        avgSavedPercent: 0
      });
    }

    const s = stats[0];
    const totalBytesSaved = Math.max(0, s.totalOriginalBytes - s.totalCompressedBytes);
    const totalMBSaved = (totalBytesSaved / (1024 * 1024)).toFixed(1);

    return res.json({
      totalImages: s.totalImages,
      totalBytesSaved,
      totalMBSaved: parseFloat(totalMBSaved),
      avgSavedPercent: parseFloat(s.avgSavedPercent.toFixed(1))
    });
  } catch (error) {
    // Graceful offline fallback
    return res.json({
      totalImages: 0,
      totalBytesSaved: 0,
      totalMBSaved: 0,
      avgSavedPercent: 0,
      offline: true
    });
  }
});

/**
 * Get Recent Optimization Logs
 */
router.get('/recent', async (req, res) => {
  try {
    const logs = await OptimizationLog.find().sort({ createdAt: -1 }).limit(20);
    return res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch logs', details: error.message });
  }
});

export default router;
