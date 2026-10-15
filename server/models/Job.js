const mongoose = require('mongoose');
const { MIN_GRADES, JOB_TYPES, TRACKS, JOB_STATUSES } = require('../utils/jobBoard');
const { SECTORS } = require('./Employer');

/**
 * A job board listing.
 *
 * `status` is the source of truth for visibility; only 'published' listings
 * reach the public board. Employer listings start 'pending' and wait for the
 * Secretariat. Listings an admin posts directly start 'published'.
 *
 * `isActive` predates the status field and is kept in step with it
 * (published ⇔ isActive) so anything still reading it keeps working.
 */
const jobSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  company:     { type: String, required: true, trim: true },
  location:    { type: String, required: true, trim: true },   // town / address line
  state:       { type: String, trim: true, default: '' },      // Nigerian state, for filters + chapters
  type:        { type: String, enum: JOB_TYPES, default: 'full-time' },
  track:       { type: String, enum: TRACKS, default: 'job' },
  sector:      { type: String, enum: SECTORS, default: 'other' },
  minGrade:    { type: String, enum: MIN_GRADES, default: 'none' },
  requiresQS:  { type: Boolean, default: false },               // role needs a qualified QS
  membersOnly: { type: Boolean, default: false },               // only NIQS members may apply
  description: { type: String, required: true },
  requirements:{ type: String, default: '' },
  salary:      { type: String, trim: true, default: '' },       // free text, as displayed
  salaryMin:   { type: Number, min: 0 },                        // monthly NGN, for filtering
  salaryMax:   { type: Number, min: 0 },
  logo:        { type: String, trim: true, default: '' },
  deadline:    { type: Date },

  /* How people apply. 'portal' collects applications here; 'external' sends
     them to the employer's own link, as the old board did. */
  applyMethod:     { type: String, enum: ['portal', 'external'], default: 'portal' },
  applicationLink: { type: String, trim: true, default: '' },

  /* Ownership: an employer listing, or one an admin posted on someone's behalf */
  employer:    { type: mongoose.Schema.Types.ObjectId, ref: 'Employer' },
  postedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

  /* Moderation */
  status:        { type: String, enum: JOB_STATUSES, default: 'pending' },
  isActive:      { type: Boolean, default: false },
  submittedAt:   { type: Date },
  publishedAt:   { type: Date },
  reviewedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  reviewedAt:    { type: Date },
  moderationNote:{ type: String, trim: true, default: '' },     // shown to the employer
  pausedByEmployer: { type: Boolean, default: false },         // their own pause; they may resume
  closedAt:      { type: Date },
  filledThroughNiqs: { type: Boolean },                         // asked when marked filled

  /* Featured placement (paid) */
  featured: {
    requested:   { type: Boolean, default: false },
    requestedAt: { type: Date },
    active:      { type: Boolean, default: false },
    until:       { type: Date },
    paid:        { type: Boolean, default: false },
    amount:      { type: Number, default: 0 },                  // NGN actually received
    reference:   { type: String, trim: true, default: '' },     // receipt / payment ref
    paidAt:      { type: Date },
    viaPackage:  { type: Boolean, default: false },
    inNewsletter:{ type: Boolean, default: false },
  },

  /* Standard listing fee, when the Secretariat charges one */
  listingFee: {
    amount:    { type: Number, default: 0 },
    reference: { type: String, trim: true, default: '' },
    paidAt:    { type: Date },
  },

  /* Counters */
  views:           { type: Number, default: 0 },
  applicationCount:{ type: Number, default: 0 },

  /* Retention: applications and CVs for this listing are purged after this */
  purgeAfter:     { type: Date },
  alertsSentAt:   { type: Date },
}, { timestamps: true });

jobSchema.pre('save', function (next) {
  this.isActive = this.status === 'published';
  next();
});

/** Featured right now: switched on, and not past its end date. */
jobSchema.methods.isFeaturedNow = function () {
  const f = this.featured || {};
  return Boolean(f.active && (!f.until || new Date(f.until) > new Date()));
};

jobSchema.index({ status: 1, state: 1, track: 1, createdAt: -1 });
jobSchema.index({ employer: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
