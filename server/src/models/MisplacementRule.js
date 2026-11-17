import mongoose from 'mongoose';

const misplacementRuleSchema = new mongoose.Schema({
  filePattern: { type: String, required: true, index: true },
  ruleType: { type: String, enum: ['exact', 'pattern', 'dateRange'], default: 'exact' },
  sourceFolder: { type: String, required: true },
  correctFolder: { type: String, required: true },
  confidence: { type: Number, default: 100 },
  createdAt: { type: Date, default: Date.now }
});

misplacementRuleSchema.index({ filePattern: 1, sourceFolder: 1 }, { unique: true });

export const MisplacementRule = mongoose.model('MisplacementRule', misplacementRuleSchema);
