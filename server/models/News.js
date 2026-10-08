const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true },
  content: { type: String, required: true },
  excerpt: { type: String, maxlength: 300 },
  image: { type: String },
  category: {
    type: String,
    enum: ['announcement', 'update', 'press', 'chapter_news', 'event_recap', 'general'],
    default: 'general'
  },
  tags: [{ type: String, trim: true }],
  scope: { type: String, enum: ['national', 'chapter'], default: 'national' },
  chapter: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', default: null },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  isPublished: { type: Boolean, default: true },
  // Homepage spotlight (three slots, enforced in the controller).
  isFeatured: { type: Boolean, default: false },
  views: { type: Number, default: 0 }
}, { timestamps: true });

newsSchema.pre('save', function (next) {
  if (!this.slug) {
    this.slug = this.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();
  }
  if (!this.excerpt && this.content) {
    this.excerpt = this.content.replace(/<[^>]*>/g, '').substring(0, 250) + '...';
  }
  next();
});

module.exports = mongoose.model('News', newsSchema);
