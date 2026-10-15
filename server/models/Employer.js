const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * An employer account on the NIQS job board.
 *
 * Firms register themselves, then wait: nothing they post reaches the public
 * board until the Secretariat has approved the account (status 'approved') and
 * then the listing itself. A suspended or flagged employer keeps its login so it
 * can see why, but cannot post.
 *
 * Employers are a third kind of account beside Admin and User. Their JWT carries
 * `kind: 'employer'`; middleware/auth.js resolves it to req.employer.
 */
const SECTORS = ['consultancy', 'contracting', 'public_service', 'academia', 'developer', 'other'];

const employerSchema = new mongoose.Schema({
  companyName:   { type: String, required: true, trim: true },
  contactName:   { type: String, required: true, trim: true },
  contactRole:   { type: String, trim: true, default: '' },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:      { type: String, required: true, minlength: 8 },
  phone:         { type: String, trim: true, default: '' },
  website:       { type: String, trim: true, default: '' },
  logo:          { type: String, trim: true, default: '' },
  address:       { type: String, trim: true, default: '' },
  state:         { type: String, trim: true, default: '' },
  sector:        { type: String, enum: SECTORS, default: 'other' },
  rcNumber:      { type: String, trim: true, default: '' },   // CAC registration
  about:         { type: String, trim: true, default: '' },

  /* Moderation */
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending',
  },
  statusNote:    { type: String, trim: true, default: '' },   // shown to the employer
  reviewedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  reviewedAt:    { type: Date },
  flagged:       { type: Boolean, default: false },            // misuse warning, internal
  flagNote:      { type: String, trim: true, default: '' },

  /* "Registered QS Firm" mark — set only by an admin, linked to the directory */
  qsFirm:        { type: mongoose.Schema.Types.ObjectId, ref: 'QSFirm' },

  /* Partnership + packages (Phase 3). Quotas of 0 mean "no package". */
  isPartner:     { type: Boolean, default: false },
  partner:       { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
  package: {
    name:             { type: String, trim: true, default: '' },
    listingsQuota:    { type: Number, default: 0 },
    featuredQuota:    { type: Number, default: 0 },
    featuredUsed:     { type: Number, default: 0 },
    startsAt:         { type: Date },
    expiresAt:        { type: Date },
    amountPaid:       { type: Number, default: 0 },   // NGN, for income reports
    reference:        { type: String, trim: true, default: '' },
    paidAt:           { type: Date },
  },

  lastLogin:            { type: Date },
  resetPasswordToken:   String,
  resetPasswordExpires: Date,
}, { timestamps: true });

employerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

employerSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

/** Has a live package (an end date in the future, or none set). */
employerSchema.methods.hasActivePackage = function () {
  const p = this.package || {};
  if (!p.name) return false;
  return !p.expiresAt || new Date(p.expiresAt) > new Date();
};

employerSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

module.exports = mongoose.model('Employer', employerSchema);
module.exports.SECTORS = SECTORS;
