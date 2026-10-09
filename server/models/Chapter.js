const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, trim: true },
  slug:        { type: String, unique: true },
  state:       { type: String, required: true },
  zone:        { type: String, trim: true, default: '' },       // e.g. "South West"
  chairperson: { type: String, trim: true, default: '' },
  secretary:   { type: String, trim: true, default: '' },
  address:     { type: String, trim: true, default: '' },
  email:       { type: String, trim: true, default: '' },
  phone:       { type: String, trim: true, default: '' },
  website:     { type: String, trim: true, default: '' },
  // Pin on the chapter page's state map. Empty = the state capital
  // (client/src/data/stateCapitals.js); set these to mark the actual office.
  pinLat:      { type: Number, min: 4, max: 14 },
  pinLng:      { type: Number, min: 2.5, max: 15 },
  pinLabel:    { type: String, trim: true, default: '' },
  about:       { type: String, default: '' },
  image:       { type: String, default: '' },
  memberCount: { type: Number, default: 0 },   // registered QS in the chapter
  firmCount:   { type: Number, default: 0 },   // registered QS firms in the chapter
  isActive:    { type: Boolean, default: true }
}, { timestamps: true });

chapterSchema.pre('save', function (next) {
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model('Chapter', chapterSchema);
