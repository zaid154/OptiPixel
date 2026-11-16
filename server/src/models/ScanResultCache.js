import mongoose from 'mongoose';

const scanResultCacheSchema = new mongoose.Schema({
  folderPath: {
    type: String,
    required: true,
    index: true
  },
  fileCount: {
    type: Number,
    required: true
  },
  similarityThreshold: {
    type: Number,
    required: true
  },
  matchModes: {
    type: [String],
    required: true
  },
  lastModifiedMax: {
    type: Number,
    default: 0
  },
  groups: {
    type: Array,
    required: true,
    default: []
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

scanResultCacheSchema.index({ folderPath: 1, fileCount: 1, similarityThreshold: 1 });

export default mongoose.model('ScanResultCache', scanResultCacheSchema);
