const mongoose = require('mongoose');
const { APPLICATION_STATUSES } = require('../utils/jobBoard');

/**
 * One member's application to one listing.
 *
 * `verification` is a snapshot of what the register said at the moment of
 * applying, so the employer sees exactly what was checked and when, and a later
 * lapse in the register does not silently rewrite an application already sent.
 * `source` says where it came from: 'register' (the membership portal API) or
 * 'website' (the website's own account, which is NOT a register check and is
 * shown to employers as unverified).
 *
 * Personal details (name, email, phone, CV) are copied here because they go
 * only to this employer, and are purged with the application when the listing's
 * retention period ends.
 */
const historySchema = new mongoose.Schema({
  status: { type: String, enum: APPLICATION_STATUSES },
  at:     { type: Date, default: Date.now },
  by:     { type: String, enum: ['applicant', 'employer', 'admin', 'system'] },
  note:   { type: String, trim: true, default: '' },
}, { _id: false });

const jobApplicationSchema = new mongoose.Schema({
  job:       { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  employer:  { type: mongoose.Schema.Types.ObjectId, ref: 'Employer' },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  fullName:  { type: String, trim: true, required: true },
  email:     { type: String, trim: true, lowercase: true, required: true },
  phone:     { type: String, trim: true, default: '' },
  coverNote: { type: String, trim: true, default: '', maxlength: 4000 },
  cv:        { type: mongoose.Schema.Types.ObjectId, ref: 'JobFile' },
  shareProfile: { type: Boolean, default: false },   // attach the member's career profile

  verification: {
    verified:         { type: Boolean, default: false },
    source:           { type: String, enum: ['register', 'website', 'none'], default: 'none' },
    membershipNumber: { type: String, trim: true, default: '' },
    grade:            { type: String, trim: true, default: '' },
    gradeLabel:       { type: String, trim: true, default: '' },
    goodStanding:     { type: Boolean },              // financial status, from the register
    checkedAt:        { type: Date },
  },

  status:        { type: String, enum: APPLICATION_STATUSES, default: 'submitted' },
  history:       { type: [historySchema], default: [] },
  employerNote:  { type: String, trim: true, default: '' },   // private to the employer
  viewedAt:      { type: Date },
}, { timestamps: true });

jobApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
jobApplicationSchema.index({ applicant: 1, createdAt: -1 });
jobApplicationSchema.index({ employer: 1, createdAt: -1 });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
