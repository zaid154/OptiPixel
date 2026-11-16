import mongoose from 'mongoose';

const fileCacheSchema = new mongoose.Schema({
  filePath: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  size: {
    type: Number,
    required: true,
    index: true
  },
  mtimeMs: {
    type: Number,
    required: true
  },
  partialHash: {
    type: String,
    index: true,
    default: null
  },
  fullHash: {
    type: String,
    index: true,
    default: null
  },
  dHash: {
    type: String,
    default: null
  },
  pHash: {
    type: String,
    default: null
  },
  aspectRatio: {
    type: Number,
    default: null
  },
  resolution: {
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 }
  },
  duration: {
    type: Number,
    default: 0
  },
  keyframesHash: {
    type: [String],
    default: []
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  lastScannedAt: {
    type: Date,
    default: Date.now
  }
});

fileCacheSchema.index({ size: 1, partialHash: 1 });
fileCacheSchema.index({ filePath: 1, mtimeMs: 1, size: 1 });

export default mongoose.model('FileCache', fileCacheSchema);
