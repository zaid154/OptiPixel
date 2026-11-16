import mongoose from 'mongoose';

const OperationSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['DELETE', 'MOVE_UPGRADE', 'RESCUE_MOVE'],
      required: true,
    },
    sourcePath: { type: String, required: true },
    targetPath: { type: String },
    quarantinePath: { type: String },
    originalSize: { type: Number, default: 0 },
  },
  { _id: false }
);

const ConsolidationLogSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true, index: true },
    masterFolder: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['completed', 'rolled_back'],
      default: 'completed',
      index: true,
    },
    summary: {
      keptCount: { type: Number, default: 0 },
      upgradedCount: { type: Number, default: 0 },
      rescuedCount: { type: Number, default: 0 },
      deletedCount: { type: Number, default: 0 },
      freedBytes: { type: Number, default: 0 },
    },
    operations: [OperationSchema],
  },
  {
    timestamps: true,
  }
);

export const ConsolidationLog = mongoose.model('ConsolidationLog', ConsolidationLogSchema);
