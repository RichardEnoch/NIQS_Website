const mongoose = require('mongoose');

/**
 * NIQS Digital Library item — a book, standard, guide, paper or course module.
 * Content lives on the website (decision D8, 6 Oct 2026); member progress is
 * kept in LibraryProgress until the membership portal exposes its own API.
 *
 * `access: 'members'` hides fileUrl from the public catalogue; members fetch it
 * through GET /api/library/:id/open, which also records the open.
 */
const libraryItemSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  subtitle:    { type: String, trim: true, default: '' },
  authors:     [{ type: String, trim: true }],
  description: { type: String, trim: true, default: '' },
  type:        { type: String, enum: ['book', 'standard', 'guide', 'paper', 'journal', 'course', 'video', 'template', 'other'], default: 'book' },
  category:    { type: String, trim: true, default: 'General' },
  tags:        [{ type: String, trim: true, lowercase: true }],
  publisher:   { type: String, trim: true, default: '' },
  year:        { type: Number },
  pages:       { type: Number, default: 0 },
  isbn:        { type: String, trim: true, default: '' },
  coverImage:  { type: String, trim: true, default: '' },
  fileUrl:     { type: String, trim: true, default: '' },
  fileSize:    { type: Number, default: 0 },
  storage:     { type: String, enum: ['cloudinary', 's3', 'r2', 'local', 'external'], default: 'local' },
  access:      { type: String, enum: ['public', 'members'], default: 'members' },
  cpdHours:    { type: Number, default: 0 },
  isFeatured:  { type: Boolean, default: false },
  isPublished: { type: Boolean, default: true },
  sortOrder:   { type: Number, default: 0 },
  openCount:   { type: Number, default: 0 },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

libraryItemSchema.index({ title: 'text', subtitle: 'text', description: 'text', authors: 'text', tags: 'text' });
libraryItemSchema.index({ isPublished: 1, category: 1, type: 1 });

module.exports = mongoose.model('LibraryItem', libraryItemSchema);
