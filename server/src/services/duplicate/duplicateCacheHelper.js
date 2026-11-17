import ScanResultCache from '../../models/ScanResultCache.js';
import mongoose from 'mongoose';
import { withDbRetry } from '../../utils/dbRetryQueue.js';

export class DuplicateCacheHelper {
  static async getCachedScanResult(rootPath, fileCount, similarityThreshold, matchModes) {
    if (mongoose.connection?.readyState !== 1) return null;
    try {
      const modesKey = [...(matchModes || [])].sort().join(',');
      const cached = await ScanResultCache.findOne({
        folderPath: rootPath,
        fileCount,
        similarityThreshold: Number(similarityThreshold) || 95
      }).lean();

      if (!cached) return null;

      const cachedModesKey = [...(cached.matchModes || [])].sort().join(',');
      if (cachedModesKey !== modesKey) return null;

      if (cached.groups && Array.isArray(cached.groups) && cached.groups.length > 0) {
        return cached.groups;
      }
      return null;
    } catch {
      return null;
    }
  }

  static async saveScanResult(rootPath, fileCount, similarityThreshold, matchModes, groups) {
    try {
      await withDbRetry(
        () => ScanResultCache.findOneAndUpdate(
          {
            folderPath: rootPath,
            fileCount,
            similarityThreshold: Number(similarityThreshold) || 95
          },
          {
            matchModes: matchModes || ['exact', 'visual'],
            groups: groups || [],
            updatedAt: new Date()
          },
          { upsert: true }
        ),
        '[DB] ScanResultCache save'
      );
    } catch (err) {
      console.error('[DB] ScanResultCache save failed:', err.message);
    }
  }
}
