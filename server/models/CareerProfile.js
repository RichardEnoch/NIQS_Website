const mongoose = require('mongoose');

/**
 * A member's short professional profile.
 *
 * Hidden by default. Employers see it only when the member attaches it to an
 * application, or when the member switches `visibleToEmployers` on, which lists
 * it in the talent search approved employers can use. Switching it off removes
 * it from search at once.
 */
const careerProfileSchema = new mongoose.Schema({
  user:              { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  headline:          { type: String, trim: true, default: '', maxlength: 140 },
  summary:           { type: String, trim: true, default: '', maxlength: 3000 },
  state:             { type: String, trim: true, default: '' },
  yearsExperience:   { type: Number, min: 0, max: 60, default: 0 },
  sectors:           { type: [String], default: [] },
  skills:            { type: [String], default: [] },
  qualifications:    { type: String, trim: true, default: '', maxlength: 1500 },
  cv:                { type: mongoose.Schema.Types.ObjectId, ref: 'JobFile' },
  visibleToEmployers:{ type: Boolean, default: false },
  openToWork:        { type: Boolean, default: true },
  /* Graduate track: looking for an internship / SIWES placement toward TPC or GDE */
  seekingPlacement:  { type: Boolean, default: false },
  institution:       { type: String, trim: true, default: '' },
  savedJobs:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
}, { timestamps: true });

module.exports = mongoose.model('CareerProfile', careerProfileSchema);
