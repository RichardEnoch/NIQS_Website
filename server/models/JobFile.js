const mongoose = require('mongoose');

/**
 * A CV, kept in the database rather than the public file store.
 *
 * Everything in utils/storage.js is served from a public CDN URL, which is right
 * for logos and flyers and wrong for a CV: anyone holding the link could read
 * it. These are small (capped at 2 MB, PDF or Word) and are only ever streamed
 * through an authenticated route to the member who owns it, an employer they
 * applied to, or an admin.
 */
const jobFileSchema = new mongoose.Schema({
  owner:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filename:     { type: String, trim: true, required: true },
  mimetype:     { type: String, trim: true, required: true },
  size:         { type: Number, required: true },
  data:         { type: Buffer, required: true, select: false },
}, { timestamps: true });

module.exports = mongoose.model('JobFile', jobFileSchema);
