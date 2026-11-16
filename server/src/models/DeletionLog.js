import mongoose from 'mongoose';

const deletionLogSchema = new mongoose.Schema({
  batchId: {
    type: String,
    required: true,
    index: true
  },
  originalPath: {
    type: String,
    required: true
  },
  quarantinePath: {
    type: String,
    default: null
  },
  actionType: {
    type: String,
    enum: ['quarantine', 'trash', 'permanent'],
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  deletedAt: {
    type: Date,
    default: Date.now
  },
  restored: {
    type: Boolean,
    default: false
  },
  restoredAt: {
    type: Date,
    default: null
  }
});

deletionLogSchema.index({ batchId: 1, restored: 1 });

export default mongoose.model('DeletionLog', deletionLogSchema);
