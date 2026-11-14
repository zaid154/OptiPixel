import mongoose from 'mongoose';

const optimizationLogSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true
  },
  originalSize: {
    type: Number,
    required: true
  },
  compressedSize: {
    type: Number,
    required: true
  },
  percentageSaved: {
    type: Number,
    required: true
  },
  format: {
    type: String,
    required: true
  },
  dimensions: {
    width: Number,
    height: Number
  },
  ipAddress: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 7 // Auto-clean after 7 days
  }
});

export const OptimizationLog = mongoose.model('OptimizationLog', optimizationLogSchema);
