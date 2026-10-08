const mongoose = require('mongoose');

const excoSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  // The one-line form shown on the site, when the automatic initials
  // (client/src/utils/names.js) get a name wrong. Empty = use the rule.
  shortName: { type: String, trim: true, default: '' },
  title: { type: String, required: true, trim: true },
  state: { type: String, trim: true, default: '' },          // e.g. "Lagos State"
  linkedIn: { type: String, trim: true, default: '' },       // LinkedIn profile URL
  image: { type: String },
  bio: { type: String },
  email: { type: String, trim: true },
  phone: { type: String },
  scope: { type: String, enum: ['national', 'npc', 'body-heads', 'bot', 'chapter', 'yqsf'], default: 'national' },
  chapter: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', default: null },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Exco', excoSchema);
