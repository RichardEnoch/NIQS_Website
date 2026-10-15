const mongoose = require('mongoose');

/**
 * Job board policy — one document (_id: 'global').
 *
 * Every open decision in the proposal ("Decisions needed from NIQS") is a
 * setting here rather than a hard-coded choice, so the Secretariat can set it
 * from /admin/jobs without a code change.
 */
const jobBoardSettingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },

  /* Who moderates, and how fast */
  moderatorEmails:    { type: [String], default: [] },   // notified of new employers + listings
  approvalTargetHours:{ type: Number, default: 48 },

  /* Pricing (NGN). 0 = free. */
  standardListingFee: { type: Number, default: 0 },
  featuredFee:        { type: Number, default: 0 },
  featuredDays:       { type: Number, default: 30 },
  paymentInstructions:{ type: String, trim: true, default: '' }, // bank details etc., shown to employers

  /* Who may apply */
  nonMembersCanApply: { type: Boolean, default: true },   // false = every listing is members-only
  requireRegisterCheck:{ type: Boolean, default: false }, // block applications the register cannot confirm

  /* Applicant data retention, in days after a listing closes */
  retentionDays:      { type: Number, default: 180 },

  /* Talent search: approved employers may search visible career profiles */
  talentSearchEnabled:{ type: Boolean, default: true },

  /* Packages offered, for the employer page and the admin picker */
  packages: {
    type: [{
      name:          { type: String, trim: true },
      price:         { type: Number, default: 0 },
      listingsQuota: { type: Number, default: 0 },
      featuredQuota: { type: Number, default: 0 },
      months:        { type: Number, default: 12 },
      description:   { type: String, trim: true, default: '' },
    }],
    default: [],
  },
}, { timestamps: true });

jobBoardSettingsSchema.statics.get = async function () {
  let doc = await this.findById('global');
  if (!doc) doc = await this.create({ _id: 'global' });
  return doc;
};

module.exports = mongoose.model('JobBoardSettings', jobBoardSettingsSchema);
