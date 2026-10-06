const mongoose = require('mongoose');

/**
 * One row per member per library item. Lives on the website for now (D8);
 * shaped to match the portal's proposed progress API
 * (docs/MEMBERSHIP_PORTAL_ACCESS_REQUIREMENTS.md §E) so it can move later.
 */
const libraryProgressSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  item:        { type: mongoose.Schema.Types.ObjectId, ref: 'LibraryItem', required: true },
  percent:     { type: Number, min: 0, max: 100, default: 0 },
  lastPage:    { type: Number, default: 0 },
  status:      { type: String, enum: ['saved', 'in_progress', 'completed'], default: 'in_progress' },
  saved:       { type: Boolean, default: false },
  openedAt:    { type: Date, default: Date.now },
  completedAt: { type: Date },
}, { timestamps: true });

libraryProgressSchema.index({ user: 1, item: 1 }, { unique: true });

module.exports = mongoose.model('LibraryProgress', libraryProgressSchema);
