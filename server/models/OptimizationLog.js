import mongoose from 'mongoose';

const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDurationMs = (ms) => {
  if (ms === undefined || ms === null || ms <= 0) return '0ms';
  if (ms < 10) return `${parseFloat(Number(ms).toFixed(2))}ms`;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${parseFloat(sec.toFixed(1))}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
};

const optimizationLogSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true, trim: true },
    relativePath: { type: String, default: '', trim: true },
    format: { type: String, required: true, lowercase: true, trim: true },
    module: {
      type: String,
      enum: ['folder_batch', 'video_studio', 'image_studio', 'duplicate_cleaner', 'duplicate_scan'],
      default: 'folder_batch'
    },
    status: {
      type: String,
      enum: ['optimized', 'preserved_optimal', 'failed', 'cleaned', 'scanned'],
      default: 'optimized'
    },
    // Human-Readable Display Fields (KB, MB, GB, sec)
    originalSize: { type: String, default: '0 B' },
    compressedSize: { type: String, default: '0 B' },
    bytesSaved: { type: String, default: '0 B' },
    percentageSaved: { type: String, default: '0.0%' },
    timeTaken: { type: String, default: '0s' },

    // Raw numbers for global aggregation calculations
    rawOriginalBytes: { type: Number, default: 0 },
    rawCompressedBytes: { type: Number, default: 0 },
    rawBytesSaved: { type: Number, default: 0 },
    rawPercentSaved: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now, index: true }
  },
  {
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Backward-compatible virtual accessors
optimizationLogSchema.virtual('originalBytes').get(function () {
  return this.rawOriginalBytes || 0;
});
optimizationLogSchema.virtual('compressedBytes').get(function () {
  return this.rawCompressedBytes || 0;
});

// Pre-validate hook: automatically format raw numbers into KB/MB/GB strings
optimizationLogSchema.pre('validate', function (next) {
  let origBytes = typeof this.originalSize === 'number' ? this.originalSize : (this.rawOriginalBytes || 0);
  let compBytes = typeof this.compressedSize === 'number' ? this.compressedSize : (this.rawCompressedBytes || 0);

  if (typeof this.originalSize === 'string' && this.originalSize.includes(' ') && !this.rawOriginalBytes) {
    // Already formatted string
  } else {
    this.rawOriginalBytes = origBytes;
    this.originalSize = formatBytes(origBytes);
  }

  if (typeof this.compressedSize === 'string' && this.compressedSize.includes(' ') && !this.rawCompressedBytes) {
    // Already formatted string
  } else {
    this.rawCompressedBytes = compBytes;
    this.compressedSize = formatBytes(compBytes);
  }

  const savedNum = Math.max(0, this.rawOriginalBytes - this.rawCompressedBytes);
  this.rawBytesSaved = savedNum;
  if (typeof this.bytesSaved === 'number' || !this.bytesSaved || !this.bytesSaved.includes(' ')) {
    this.bytesSaved = formatBytes(savedNum);
  }

  const pct = this.rawOriginalBytes > 0 ? ((savedNum / this.rawOriginalBytes) * 100) : 0;
  this.rawPercentSaved = parseFloat(pct.toFixed(1));
  if (typeof this.percentageSaved === 'number' || !this.percentageSaved || !this.percentageSaved.includes('%')) {
    this.percentageSaved = `${this.rawPercentSaved}%`;
  }

  if (this.timeTakenMs && (!this.timeTaken || this.timeTaken === '0s')) {
    this.timeTaken = formatDurationMs(this.timeTakenMs);
  } else if (typeof this.timeTaken === 'number') {
    this.timeTaken = formatDurationMs(this.timeTaken);
  }

  next();
});

export const OptimizationLog = mongoose.model('OptimizationLog', optimizationLogSchema);
