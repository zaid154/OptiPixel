import mongoose from 'mongoose';

export function normalizePath(p) {
  if (!p) return '';
  return p.replace(/\\+/g, '/').replace(/\/+/g, '/').replace(/\/+$/, '').toLowerCase();
}

const misplacementRuleSchema = new mongoose.Schema({
  filePattern: { type: String, required: true, index: true },
  ruleType: { type: String, enum: ['exact', 'pattern', 'dateRange'], default: 'exact' },
  sourceFolder: { type: String, required: true },
  correctFolder: { type: String, required: true },
  confidence: { type: Number, default: 100 },
  createdAt: { type: Date, default: Date.now }
});

misplacementRuleSchema.pre('save', function (next) {
  if (this.sourceFolder) this.sourceFolder = normalizePath(this.sourceFolder);
  if (this.correctFolder) this.correctFolder = normalizePath(this.correctFolder);
  if (!this.ruleType) this.ruleType = 'exact';
  next();
});

misplacementRuleSchema.index({ filePattern: 1, sourceFolder: 1 }, { unique: true });

export const MisplacementRule = mongoose.model('MisplacementRule', misplacementRuleSchema);
