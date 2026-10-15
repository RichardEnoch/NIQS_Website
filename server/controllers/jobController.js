/**
 * Job listings: the public board, employers' own listings, and moderation.
 *
 * Applications, saved jobs, alerts and profiles live in careerController.js;
 * reports, employer moderation and settings in jobAdminController.js.
 */
const mongoose = require('mongoose');
const Job = require('../models/Job');
const Employer = require('../models/Employer');
const Chapter = require('../models/Chapter');
const JobApplication = require('../models/JobApplication');
const JobFile = require('../models/JobFile');
const CareerProfile = require('../models/CareerProfile');
const JobBoardSettings = require('../models/JobBoardSettings');
const { NIGERIAN_STATES } = require('../models/QSFirm');
const { minGradesMetBy, escapeRegex, JOB_TYPES, TRACKS, MIN_GRADES, SECTOR_LABELS, GRADE_LABELS } = require('../utils/jobBoard');
const { dispatchAlertsForJob, scheduleRetention } = require('../utils/jobBoardService');
const { notifyModeratorsListing, listingStatusEmail } = require('../utils/jobMail');

const isId = (v) => mongoose.Types.ObjectId.isValid(v);

/* Fields an employer (or an admin, on their behalf) may write on a listing. */
const LISTING_FIELDS = [
  'title', 'company', 'location', 'state', 'type', 'track', 'sector', 'minGrade', 'requiresQS',
  'membersOnly', 'description', 'requirements', 'salary', 'salaryMin', 'salaryMax', 'logo',
  'deadline', 'applyMethod', 'applicationLink',
];

function pickListing(body) {
  const out = {};
  for (const f of LISTING_FIELDS) {
    if (body[f] === undefined) continue;
    let v = body[f];
    if (typeof v === 'string') v = v.trim();
    if ((f === 'salaryMin' || f === 'salaryMax') && (v === '' || v === null)) v = undefined;
    if (f === 'deadline' && (v === '' || v === null)) v = undefined;
    out[f] = v;
  }
  return out;
}

/** The professional-standards rule: a role that needs a QS must name a grade. */
function validateListing(job) {
  if (job.requiresQS && (!job.minGrade || job.minGrade === 'none')) {
    return 'A role that requires a qualified quantity surveyor must state the minimum NIQS grade.';
  }
  if (job.applyMethod === 'external' && !/^https?:\/\//i.test(job.applicationLink || '')) {
    return 'An external application link must start with http:// or https://';
  }
  if (job.salaryMin != null && job.salaryMax != null && Number(job.salaryMin) > Number(job.salaryMax)) {
    return 'Minimum salary is higher than the maximum.';
  }
  if (job.state && !NIGERIAN_STATES.includes(job.state) && job.state !== 'Outside Nigeria') {
    return 'Choose a Nigerian state for the listing, or "Outside Nigeria".';
  }
  return null;
}

/** What the public sees of a listing. Moderation and money stay internal. */
function publicView(job, { savedIds } = {}) {
  const o = job.toObject ? job.toObject() : job;
  const emp = o.employer && typeof o.employer === 'object' && o.employer.companyName ? o.employer : null;
  const featuredNow = Boolean(o.featured?.active && (!o.featured.until || new Date(o.featured.until) > new Date()));
  return {
    _id: o._id,
    title: o.title, company: o.company, location: o.location, state: o.state,
    type: o.type, track: o.track, sector: o.sector, sectorLabel: SECTOR_LABELS[o.sector] || o.sector,
    minGrade: o.minGrade, minGradeLabel: GRADE_LABELS[o.minGrade] || '', requiresQS: o.requiresQS,
    membersOnly: o.membersOnly,
    description: o.description, requirements: o.requirements,
    salary: o.salary, salaryMin: o.salaryMin, salaryMax: o.salaryMax,
    logo: o.logo || emp?.logo || '',
    deadline: o.deadline, applyMethod: o.applyMethod,
    applicationLink: o.applyMethod === 'external' ? o.applicationLink : '',
    publishedAt: o.publishedAt || o.createdAt, createdAt: o.createdAt,
    status: o.status,
    featured: featuredNow,
    employer: emp ? {
      _id: emp._id, companyName: emp.companyName, website: emp.website, logo: emp.logo,
      sector: emp.sector, state: emp.state, about: emp.about,
      registeredFirm: Boolean(emp.qsFirm),
      qsFirm: emp.qsFirm && typeof emp.qsFirm === 'object' ? { _id: emp.qsFirm._id, name: emp.qsFirm.name } : undefined,
      isPartner: Boolean(emp.isPartner),
    } : null,
    saved: savedIds ? savedIds.has(String(o._id)) : undefined,
  };
}

const EMPLOYER_PUBLIC = 'companyName website logo sector state about qsFirm isPartner';
const EMPLOYER_POPULATE = { path: 'employer', select: EMPLOYER_PUBLIC, populate: { path: 'qsFirm', select: 'name' } };

/* ═════════════ Public board ═════════════ */

/**
 * GET /api/jobs
 * Filters: q, state, sector, type, track (default 'job'; allTracks=1 for
 * every track), minGrade (exact), eligible=<grade> (listings that grade
 * meets), salaryMin/salaryMax (monthly NGN overlap), employer, featured=1,
 * page, limit. Featured listings sort first.
 */
exports.getAllJobs = async (req, res) => {
  try {
    const { q, state, sector, type, track, minGrade, eligible, salaryMin, salaryMax, employer, featured } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));

    const filter = { status: 'published' };
    const and = [];
    if (state) filter.state = { $in: String(state).split(',') };
    if (sector) filter.sector = { $in: String(sector).split(',') };
    if (type) filter.type = { $in: String(type).split(',') };
    if (track) filter.track = { $in: String(track).split(',') };
    else if (req.query.allTracks !== '1') filter.track = 'job';
    if (minGrade && MIN_GRADES.includes(minGrade)) filter.minGrade = minGrade;
    if (eligible) filter.minGrade = { $in: minGradesMetBy(eligible) };
    if (employer && isId(employer)) filter.employer = employer;
    if (q) {
      const rx = new RegExp(escapeRegex(String(q).slice(0, 80)), 'i');
      and.push({ $or: [{ title: rx }, { company: rx }, { location: rx }, { state: rx }, { description: rx }] });
    }
    // Salary ranges overlap the requested band. A listing with no figures is
    // excluded once a band is asked for: we cannot say it matches.
    if (salaryMin) and.push({ $or: [{ salaryMax: { $gte: Number(salaryMin) } }, { salaryMax: null, salaryMin: { $gte: Number(salaryMin) } }] });
    if (salaryMax) and.push({ salaryMin: { $lte: Number(salaryMax) } });
    if (and.length) filter.$and = and;

    // The board is small (hundreds, not millions), so featured-first ordering
    // is done here rather than with a computed sort key in Mongo.
    const all = await Job.find(filter).populate(EMPLOYER_POPULATE).sort('-publishedAt -createdAt').limit(1000);

    let rows = all.map((j) => publicView(j, { savedIds: req.savedIds }));
    if (featured === '1') rows = rows.filter((r) => r.featured);
    rows.sort((a, b) => Number(b.featured) - Number(a.featured));

    const total = rows.length;
    res.json({
      jobs: rows.slice((page - 1) * limit, page * limit),
      total, page, pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/** GET /api/jobs/meta: option lists and live counts for the filter bar. */
exports.getMeta = async (req, res) => {
  try {
    const [byState, byTrack, settings] = await Promise.all([
      Job.aggregate([{ $match: { status: 'published' } }, { $group: { _id: '$state', n: { $sum: 1 } } }]),
      Job.aggregate([{ $match: { status: 'published' } }, { $group: { _id: '$track', n: { $sum: 1 } } }]),
      JobBoardSettings.get(),
    ]);
    res.json({
      states: NIGERIAN_STATES,
      sectors: Object.entries(SECTOR_LABELS).map(([value, label]) => ({ value, label })),
      grades: MIN_GRADES.map((value) => ({ value, label: GRADE_LABELS[value] })),
      types: JOB_TYPES,
      tracks: TRACKS,
      countsByState: Object.fromEntries(byState.filter((r) => r._id).map((r) => [r._id, r.n])),
      countsByTrack: Object.fromEntries(byTrack.map((r) => [r._id, r.n])),
      nonMembersCanApply: settings.nonMembersCanApply,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * GET /api/jobs/:id
 * Published listings are public. The owning employer and admins also see
 * drafts and pending listings, with the moderation fields. Closed listings
 * stay readable so an old link explains itself.
 */
exports.getJobById = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Job not found' });
    const job = await Job.findById(req.params.id).populate(EMPLOYER_POPULATE);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const owner = Boolean(req.employer && job.employer && String(job.employer._id) === String(req.employer._id));
    const privileged = owner || Boolean(req.admin);
    if (!privileged && !['published', 'closed', 'filled'].includes(job.status)) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (job.status === 'published' && !privileged) {
      Job.updateOne({ _id: job._id }, { $inc: { views: 1 } }).catch(() => {});
    }

    const view = publicView(job, { savedIds: req.savedIds });
    if (privileged) {
      Object.assign(view, {
        moderationNote: job.moderationNote, views: job.views, applicationCount: job.applicationCount,
        featuredInfo: job.featured, submittedAt: job.submittedAt, applicationLink: job.applicationLink,
      });
    }
    if (req.user) {
      const mine = await JobApplication.findOne({ job: job._id, applicant: req.user._id }).select('status createdAt');
      view.myApplication = mine || null;
    }
    res.json(view);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ═════════════ Employers' own listings ═════════════ */

exports.myListings = async (req, res) => {
  try {
    const jobs = await Job.find({ employer: req.employer._id }).sort('-createdAt');
    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

async function ownListing(req, res) {
  if (!isId(req.params.id)) { res.status(404).json({ message: 'Listing not found' }); return null; }
  const job = await Job.findOne({ _id: req.params.id, employer: req.employer._id });
  if (!job) { res.status(404).json({ message: 'Listing not found' }); return null; }
  return job;
}

function queueNotice(job, employer) {
  JobBoardSettings.get().then((s) => notifyModeratorsListing(s, job, employer)).catch(() => {});
}

/**
 * POST /api/jobs/mine. `submit: true` sends it straight to moderation,
 * otherwise it is saved as a draft. Unapproved employers can only draft.
 */
exports.createMyListing = async (req, res) => {
  try {
    const data = pickListing(req.body);
    const job = new Job({
      ...data,
      company: data.company || req.employer.companyName,
      logo: data.logo || req.employer.logo,
      employer: req.employer._id,
      status: 'draft',
    });
    const problem = validateListing(job);
    if (problem) return res.status(400).json({ message: problem });

    if (req.body.submit) {
      if (req.employer.status !== 'approved') {
        await job.save();
        return res.status(202).json({ job, message: 'Saved as a draft. You can submit it once the Secretariat has approved your employer account.' });
      }
      job.status = 'pending';
      job.submittedAt = new Date();
    }
    await job.save();
    if (job.status === 'pending') queueNotice(job, req.employer);
    res.status(201).json({ job });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * PUT /api/jobs/mine/:id. Editing a live listing sends it back to the queue:
 * the Secretariat approved the old wording, not the new one.
 */
exports.updateMyListing = async (req, res) => {
  try {
    const job = await ownListing(req, res);
    if (!job) return;
    if (['closed', 'filled'].includes(job.status)) {
      return res.status(400).json({ message: 'A closed listing cannot be edited. Post a new one instead.' });
    }
    if (job.status === 'paused' && !job.pausedByEmployer) {
      return res.status(403).json({ message: 'The Secretariat paused this listing. Please contact them about changes.' });
    }
    Object.assign(job, pickListing(req.body));
    const problem = validateListing(job);
    if (problem) return res.status(400).json({ message: problem });

    let requeued = false;
    const resubmit = ['published', 'rejected', 'pending', 'paused'].includes(job.status) || (req.body.submit && job.status === 'draft');
    if (resubmit) {
      if (req.employer.status !== 'approved') {
        job.status = 'draft';
      } else {
        requeued = job.status === 'published' || job.status === 'paused';
        job.status = 'pending';
        job.submittedAt = new Date();
      }
    }
    await job.save();
    if (job.status === 'pending') queueNotice(job, req.employer);
    res.json({ job, requeued });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * POST /api/jobs/mine/:id/status { action }
 *   submit | pause | resume | close | fill { filledThroughNiqs }
 */
exports.setMyListingStatus = async (req, res) => {
  try {
    const job = await ownListing(req, res);
    if (!job) return;
    const { action } = req.body;
    const now = new Date();

    if (action === 'submit') {
      if (req.employer.status !== 'approved') return res.status(403).json({ message: 'Your employer account is waiting for approval.' });
      if (!['draft', 'rejected'].includes(job.status)) return res.status(400).json({ message: 'Only drafts can be submitted.' });
      job.status = 'pending';
      job.submittedAt = now;
    } else if (action === 'pause') {
      if (job.status !== 'published') return res.status(400).json({ message: 'Only a live listing can be paused.' });
      job.status = 'paused';
      job.moderationNote = '';
      job.pausedByEmployer = true;
    } else if (action === 'resume') {
      // The employer can undo their own pause, not one by the Secretariat.
      if (job.status !== 'paused') return res.status(400).json({ message: 'This listing is not paused.' });
      if (!job.pausedByEmployer) {
        return res.status(403).json({ message: 'The Secretariat paused this listing. Please contact them to restore it.' });
      }
      if (req.employer.status !== 'approved') return res.status(403).json({ message: 'Your employer account cannot publish listings right now.' });
      job.status = 'published';
      job.pausedByEmployer = false;
    } else if (action === 'close' || action === 'fill') {
      if (['closed', 'filled'].includes(job.status)) return res.status(400).json({ message: 'Already closed.' });
      job.status = action === 'fill' ? 'filled' : 'closed';
      job.closedAt = now;
      job.featured.active = false;
      if (action === 'fill') job.filledThroughNiqs = Boolean(req.body.filledThroughNiqs);
      await scheduleRetention(job);
    } else {
      return res.status(400).json({ message: 'Unknown action' });
    }
    await job.save();
    if (job.status === 'pending') queueNotice(job, req.employer);
    res.json({ job });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteMyListing = async (req, res) => {
  try {
    const job = await ownListing(req, res);
    if (!job) return;
    if (!['draft', 'rejected'].includes(job.status) || job.applicationCount > 0) {
      return res.status(400).json({ message: 'Only drafts without applications can be deleted. Close the listing instead.' });
    }
    await job.deleteOne();
    res.json({ message: 'Draft deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

function startFeatured(job, days) {
  job.featured.active = job.status === 'published';
  job.featured.until = new Date(Date.now() + days * 86_400_000);
}

/**
 * POST /api/jobs/mine/:id/feature: ask for featured placement. Uses a
 * package slot when one is left; when featuring is free it is confirmed at
 * once; otherwise the request waits for the Secretariat to confirm payment.
 * Placement starts when the listing is live.
 */
exports.requestFeatured = async (req, res) => {
  try {
    const job = await ownListing(req, res);
    if (!job) return;
    if (['closed', 'filled', 'rejected'].includes(job.status)) return res.status(400).json({ message: 'This listing cannot be featured.' });
    if (job.isFeaturedNow() || (job.featured.requested && job.featured.paid)) {
      return res.status(400).json({ message: 'This listing is already featured.' });
    }

    const settings = await JobBoardSettings.get();
    const employer = await Employer.findById(req.employer._id);
    const pkg = employer.package || {};
    const slotLeft = employer.hasActivePackage() && (pkg.featuredQuota || 0) > (pkg.featuredUsed || 0);

    job.featured.requested = true;
    job.featured.requestedAt = new Date();
    if (slotLeft) {
      employer.package.featuredUsed = (pkg.featuredUsed || 0) + 1;
      await employer.save();
      job.featured.viaPackage = true;
      job.featured.paid = true;
      startFeatured(job, settings.featuredDays);
    } else if (!settings.featuredFee) {
      job.featured.paid = true;
      startFeatured(job, settings.featuredDays);
    }
    await job.save();
    res.json({
      job,
      viaPackage: slotLeft,
      confirmed: job.featured.paid,
      fee: job.featured.paid ? 0 : settings.featuredFee,
      paymentInstructions: job.featured.paid ? '' : settings.paymentInstructions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ═════════════ Admin: listings + moderation ═════════════ */

/** GET /api/jobs/admin/all?status=&q=&employer=&featuredRequested=1 */
exports.adminList = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
    if (req.query.employer && isId(req.query.employer)) filter.employer = req.query.employer;
    if (req.query.featuredRequested === '1') { filter['featured.requested'] = true; filter['featured.paid'] = false; }
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(req.query.q), 'i');
      filter.$or = [{ title: rx }, { company: rx }, { location: rx }];
    }
    const jobs = await Job.find(filter)
      .populate('employer', 'companyName contactName email phone status flagged flagNote qsFirm isPartner')
      .populate('reviewedBy', 'firstName lastName')
      .sort(req.query.status === 'pending' ? 'submittedAt' : '-createdAt')
      .limit(500);
    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/** POST /api/jobs (admin posts directly; live at once unless saved as draft) */
exports.createJob = async (req, res) => {
  try {
    const data = pickListing(req.body);
    const job = new Job({
      ...data,
      postedBy: req.admin._id,
      employer: isId(req.body.employer) ? req.body.employer : undefined,
      applyMethod: data.applyMethod || (data.applicationLink ? 'external' : 'portal'),
      status: req.body.status === 'draft' ? 'draft' : 'published',
    });
    const problem = validateListing(job);
    if (problem) return res.status(400).json({ message: problem });
    if (job.status === 'published') {
      job.publishedAt = new Date();
      job.reviewedBy = req.admin._id;
      job.reviewedAt = new Date();
    }
    await job.save();
    if (job.status === 'published') setImmediate(() => dispatchAlertsForJob(job._id));
    res.status(201).json(job);
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/** PUT /api/jobs/:id (admin edit; keeps the current status) */
exports.updateJob = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Job not found' });
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    Object.assign(job, pickListing(req.body));
    if (req.body.employer !== undefined) job.employer = isId(req.body.employer) ? req.body.employer : undefined;
    const problem = validateListing(job);
    if (problem) return res.status(400).json({ message: problem });
    await job.save();
    res.json(job);
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * POST /api/jobs/:id/moderate { action, note }
 *   approve | reject | pause | restore | remove (close, with a reason)
 */
exports.moderate = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Job not found' });
    const job = await Job.findById(req.params.id).populate('employer');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    const { action } = req.body;
    const note = String(req.body.note || '').trim();
    const now = new Date();
    const wasPublished = job.status === 'published';

    if (action === 'approve' || action === 'restore') {
      if (job.employer && job.employer.status !== 'approved') {
        return res.status(400).json({ message: `Approve the employer (${job.employer.companyName}) first.` });
      }
      if (['closed', 'filled'].includes(job.status) && job.deadline && job.deadline < now) {
        return res.status(400).json({ message: 'This listing is past its deadline. Change the deadline before restoring it.' });
      }
      job.status = 'published';
      job.pausedByEmployer = false;
      if (!job.publishedAt || action === 'approve') job.publishedAt = now;
      job.purgeAfter = undefined;
      // A featured slot that was confirmed before approval starts now.
      if (job.featured?.paid && job.featured.requested && !job.featured.active) {
        const s = await JobBoardSettings.get();
        startFeatured(job, s.featuredDays);
      }
    } else if (action === 'reject') {
      if (!note) return res.status(400).json({ message: 'Give the employer a reason when rejecting a listing.' });
      job.status = 'rejected';
    } else if (action === 'pause') {
      job.status = 'paused';
      job.pausedByEmployer = false;
      job.featured.active = false;
    } else if (action === 'remove') {
      if (!note) return res.status(400).json({ message: 'Give a reason when removing a listing.' });
      job.status = 'closed';
      job.closedAt = now;
      job.featured.active = false;
      await scheduleRetention(job);
    } else {
      return res.status(400).json({ message: 'Unknown action' });
    }
    job.moderationNote = action === 'approve' || action === 'restore' ? note : note || job.moderationNote;
    job.reviewedBy = req.admin._id;
    job.reviewedAt = now;
    await job.save();

    if (job.employer) listingStatusEmail(job, job.employer).catch(() => {});
    if (job.status === 'published' && !wasPublished) setImmediate(() => dispatchAlertsForJob(job._id));
    res.json({ job });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * POST /api/jobs/:id/featured { active, days, amount, reference, inNewsletter }
 * The Secretariat confirms payment and switches placement on or off. Send
 * only `inNewsletter` to change that flag without touching the placement.
 */
exports.setFeatured = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Job not found' });
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    const s = await JobBoardSettings.get();
    const { active, days, amount, reference, inNewsletter } = req.body;

    // `active` omitted = change only the newsletter flag, leave the placement alone.
    if (active === true) {
      job.featured.requested = true;
      job.featured.paid = true;
      startFeatured(job, Math.max(1, Number(days) || s.featuredDays));
      if (amount !== undefined && Number(amount) > 0) {
        job.featured.amount = Number(amount);
        job.featured.paidAt = new Date();
      }
      if (reference !== undefined) job.featured.reference = String(reference).trim();
    } else if (active === false) {
      job.featured.active = false;
      job.featured.requested = false;
    }
    if (inNewsletter !== undefined) job.featured.inNewsletter = Boolean(inNewsletter);
    await job.save();
    res.json({ job });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/** POST /api/jobs/:id/listing-fee { amount, reference }: record a standard listing fee. */
exports.recordListingFee = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Job not found' });
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    job.listingFee = {
      amount: Math.max(0, Number(req.body.amount) || 0),
      reference: String(req.body.reference || '').trim(),
      paidAt: new Date(),
    };
    await job.save();
    res.json({ job });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Job not found' });
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    // Applicant data goes with it; nothing else would ever purge it.
    const apps = await JobApplication.find({ job: job._id }).select('cv').lean();
    await JobApplication.deleteMany({ job: job._id });
    const cvIds = apps.map((a) => a.cv).filter(Boolean);
    if (cvIds.length) {
      const keep = new Set([
        ...(await CareerProfile.find({ cv: { $in: cvIds } }).select('cv').lean()).map((p) => String(p.cv)),
        ...(await JobApplication.find({ cv: { $in: cvIds } }).select('cv').lean()).map((a) => String(a.cv)),
      ]);
      await JobFile.deleteMany({ _id: { $in: cvIds.filter((id) => !keep.has(String(id))) } });
    }
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ═════════════ Chapters ═════════════ */

/**
 * GET /api/jobs/chapter?state=
 * Live listings in a chapter's state. A state admin always gets their own
 * chapter's state; national admins may pass any state.
 */
exports.chapterJobs = async (req, res) => {
  try {
    let state = req.query.state;
    let chapter = null;
    if (req.admin?.role === 'state_admin') {
      chapter = await Chapter.findById(req.admin.assignedChapter).select('name state slug');
      if (!chapter) return res.status(403).json({ message: 'No chapter assigned to this admin' });
      state = chapter.state;
    }
    if (!state) return res.status(400).json({ message: 'Choose a state' });
    const jobs = await Job.find({ status: 'published', state }).populate(EMPLOYER_POPULATE).sort('-publishedAt');
    res.json({ state, chapter, jobs: jobs.map((j) => publicView(j)) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.publicView = publicView;
