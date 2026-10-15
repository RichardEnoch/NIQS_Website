const mongoose = require('mongoose');

/**
 * "Email me when a role like this is posted."
 *
 * Empty arrays mean "any". `matchMyGrade` limits alerts to listings the member
 * is eligible for, using their grade at send time rather than when the alert
 * was saved.
 */
const jobAlertSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:         { type: String, trim: true, default: '' },
  states:       { type: [String], default: [] },
  sectors:      { type: [String], default: [] },
  types:        { type: [String], default: [] },
  tracks:       { type: [String], default: [] },
  keywords:     { type: String, trim: true, default: '' },
  matchMyGrade: { type: Boolean, default: true },
  active:       { type: Boolean, default: true },
  lastSentAt:   { type: Date },
  sentCount:    { type: Number, default: 0 },
}, { timestamps: true });

jobAlertSchema.index({ active: 1 });

module.exports = mongoose.model('JobAlert', jobAlertSchema);
