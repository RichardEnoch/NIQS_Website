const mongoose = require('mongoose');

/* Single-document model — only one president record ever exists.
   Use upsert with a fixed key to ensure uniqueness. */
const presidentSchema = new mongoose.Schema({
  /* Identity */
  name: { type: String, default: 'Arc. Dr. [President Name]' },
  title: { type: String, default: 'President, NIQS' },
  tenure: { type: String, default: 'Elected 2023 – Present' },
  linkedIn: { type: String, default: '' },   // full URL e.g. https://linkedin.com/in/...

  /* Photos — same image used for portrait and darkened hero bg */
  photo: {
    type: String,
    default: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&fit=crop&crop=face'
  },
  backgroundImage: {
    type: String,
    default: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=1400&q=80&fit=crop'
  },

  /* Message content */
  paragraph1: {
    type: String,
    default: 'It is my honour to serve as President of the Nigerian Institute of Quantity Surveyors at this critical juncture. The construction industry is undergoing significant transformation, and NIQS is well-positioned to lead that change.'
  },
  paragraph2: {
    type: String,
    default: 'Our focus rests on three pillars: strengthening professional standards, expanding access to quality education and examination, and deepening international partnerships that give our members global relevance.'
  },
  quote: {
    type: String,
    default: '"Together, we will build a stronger, more impactful NIQS for the benefit of our members and Nigerian society."'
  },

  /* Inaugural / presidential speech — full text shown on the President page
     when speechBody is non-empty. Blocks are separated by blank lines; a block
     whose first line starts with "1." style numbering renders as a programme
     heading with its following lines as the body. */
  speechTitle: { type: String, default: '' },
  speechSubtitle: { type: String, default: '' },
  speechBody: { type: String, default: '' },

  /* Speeches & addresses on other platforms (review, Oct 2026). A list rather
     than more single fields, because the Secretariat will keep adding to it.
     The inaugural speech above stays where it is — the page shows it first
     whether or not this list has entries, so nothing existing has to move. */
  speeches: [{
    title:    { type: String, required: true, trim: true },
    platform: { type: String, default: '', trim: true },   // event or outlet, e.g. "Channels TV — Business Morning"
    date:     { type: Date },
    excerpt:  { type: String, default: '' },
    body:     { type: String, default: '' },               // full text, same block format as speechBody
    pdfUrl:   { type: String, default: '' },
    videoUrl: { type: String, default: '' },
  }],

  /* Singleton sentinel — always the same value so findOne works cleanly */
  _singleton: { type: String, default: 'president', unique: true, immutable: true },

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

module.exports = mongoose.model('President', presidentSchema);
