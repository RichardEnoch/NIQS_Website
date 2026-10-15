/**
 * Secretariat tools for the job board: employer moderation, packages and
 * partner links, reports, and board settings.
 */
const mongoose = require('mongoose');
const Employer = require('../models/Employer');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const JobBoardSettings = require('../models/JobBoardSettings');
const QSFirm = require('../models/QSFirm');
const { escapeRegex } = require('../utils/jobBoard');
const { employerStatusEmail } = require('../utils/jobMail');

const isId = (v) => mongoose.Types.ObjectId.isValid(v);

/* ═════════════ Employers ═════════════ */

/** GET /api/job-admin/employers?status=&q=&flagged=1 */
exports.listEmployers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
    if (req.query.flagged === '1') filter.flagged = true;
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(req.query.q), 'i');
      filter.$or = [{ companyName: rx }, { email: rx }, { contactName: rx }, { rcNumber: rx }];
    }
    const employers = await Employer.find(filter)
      .populate('qsFirm', 'name state')
      .populate('reviewedBy', 'firstName lastName')
      .sort(req.query.status === 'pending' ? 'createdAt' : '-createdAt')
      .limit(500)
      .lean();
    const counts = await Job.aggregate([
      { $match: { employer: { $in: employers.map((e) => e._id) } } },
      { $group: { _id: '$employer', total: { $sum: 1 }, live: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } } } },
    ]);
    const byId = new Map(counts.map((c) => [String(c._id), c]));
    res.json({
      employers: employers.map((e) => {
        delete e.password; delete e.resetPasswordToken; delete e.resetPasswordExpires;
        const c = byId.get(String(e._id));
        return { ...e, listingCount: c?.total || 0, liveCount: c?.live || 0 };
      }),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * POST /api/job-admin/employers/:id/status { status, note }
 * Suspending or rejecting an employer pauses every live listing they have.
 */
exports.setEmployerStatus = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Employer not found' });
    const employer = await Employer.findById(req.params.id);
    if (!employer) return res.status(404).json({ message: 'Employer not found' });
    const { status } = req.body;
    if (!['approved', 'rejected', 'suspended', 'pending'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const note = String(req.body.note || '').trim();
    if ((status === 'rejected' || status === 'suspended') && !note) {
      return res.status(400).json({ message: 'Give the employer a reason.' });
    }
    employer.status = status;
    employer.statusNote = note;
    employer.reviewedBy = req.admin._id;
    employer.reviewedAt = new Date();
    await employer.save();

    let paused = 0;
    if (status === 'rejected' || status === 'suspended') {
      const r = await Job.updateMany(
        { employer: employer._id, status: { $in: ['published', 'pending'] } },
        { $set: { status: 'paused', isActive: false, pausedByEmployer: false, 'featured.active': false, moderationNote: `Employer account ${status}: ${note}`, reviewedBy: req.admin._id, reviewedAt: new Date() } },
      );
      paused = r.modifiedCount;
    }
    employerStatusEmail(employer).catch(() => {});
    res.json({ employer, pausedListings: paused });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/** POST /api/job-admin/employers/:id/flag { flagged, note }: internal misuse marker. */
exports.flagEmployer = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Employer not found' });
    const employer = await Employer.findByIdAndUpdate(
      req.params.id,
      { flagged: Boolean(req.body.flagged), flagNote: String(req.body.note || '').trim() },
      { new: true },
    );
    if (!employer) return res.status(404).json({ message: 'Employer not found' });
    res.json({ employer });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * PUT /api/job-admin/employers/:id { qsFirm, isPartner, partner, package }
 * The links only the Secretariat may set: the "Registered QS Firm" mark (a
 * directory entry), partner status, and an employer package.
 */
exports.updateEmployerLinks = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Employer not found' });
    const employer = await Employer.findById(req.params.id);
    if (!employer) return res.status(404).json({ message: 'Employer not found' });
    const b = req.body;

    if (b.qsFirm !== undefined) {
      if (!b.qsFirm) employer.qsFirm = undefined;
      else if (isId(b.qsFirm) && (await QSFirm.exists({ _id: b.qsFirm }))) employer.qsFirm = b.qsFirm;
      else return res.status(400).json({ message: 'QS firm not found in the directory' });
    }
    if (b.isPartner !== undefined) employer.isPartner = Boolean(b.isPartner);
    if (b.partner !== undefined) employer.partner = isId(b.partner) ? b.partner : undefined;
    if (b.package !== undefined) {
      if (!b.package || !b.package.name) {
        employer.package = { name: '', listingsQuota: 0, featuredQuota: 0, featuredUsed: 0 };
      } else {
        const p = b.package;
        const months = Math.max(1, Number(p.months) || 12);
        const prev = employer.package || {};
        // Editing the same package keeps its term; `renew: true` starts a new one today.
        const keepTerm = !p.renew && prev.name === p.name && prev.startsAt && !p.startsAt && !p.expiresAt;
        const startsAt = keepTerm ? prev.startsAt : (p.startsAt ? new Date(p.startsAt) : new Date());
        employer.package = {
          name: String(p.name).trim(),
          listingsQuota: Math.max(0, Number(p.listingsQuota) || 0),
          featuredQuota: Math.max(0, Number(p.featuredQuota) || 0),
          featuredUsed: keepTerm ? prev.featuredUsed || 0 : 0,
          startsAt,
          expiresAt: keepTerm ? prev.expiresAt
            : p.expiresAt ? new Date(p.expiresAt) : new Date(new Date(startsAt).getTime() + months * 30.44 * 86_400_000),
          amountPaid: Math.max(0, Number(p.amountPaid) || 0),
          reference: String(p.reference || '').trim(),
          paidAt: Number(p.amountPaid) > 0 ? (prev.paidAt && prev.amountPaid === Number(p.amountPaid) ? prev.paidAt : new Date()) : undefined,
        };
      }
    }
    await employer.save();
    await employer.populate('qsFirm', 'name state');
    res.json({ employer });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ═════════════ Reports ═════════════ */

function monthKey(d) {
  const x = new Date(d);
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * GET /api/job-admin/reports?from=YYYY-MM&to=YYYY-MM&state=
 * Listings posted, applications, roles filled and income, by month and by
 * state. Income counts money recorded as received: featured fees, listing
 * fees and package payments, each in the month it was paid.
 */
async function buildReport(query) {
  const ym = (v) => (/^\d{4}-(0[1-9]|1[0-2])$/.test(String(v || '')) ? v : null);
  query = { ...query, from: ym(query.from), to: ym(query.to) };
  const now = new Date();
  const to = query.to ? new Date(`${query.to}-01T00:00:00Z`) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() + 1, 1));
  const from = query.from ? new Date(`${query.from}-01T00:00:00Z`) : new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 11, 1));
  const stateFilter = query.state ? { state: query.state } : {};

  const months = [];
  for (let d = new Date(from); d < end; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) months.push(monthKey(d));
  const blank = () => ({ posted: 0, published: 0, applications: 0, filled: 0, filledThroughNiqs: 0, income: 0 });
  const byMonth = Object.fromEntries(months.map((m) => [m, blank()]));
  const byState = {};
  const bump = (m, st, key, n = 1) => {
    if (byMonth[m]) byMonth[m][key] += n;
    const s = st || 'Not stated';
    byState[s] = byState[s] || blank();
    byState[s][key] += n;
  };

  const range = { $gte: from, $lt: end };
  const [posted, published, filled, apps, featuredPaid, feesPaid, employers] = await Promise.all([
    Job.find({ ...stateFilter, createdAt: range, status: { $ne: 'draft' } }).select('createdAt state').lean(),
    Job.find({ ...stateFilter, publishedAt: range }).select('publishedAt state').lean(),
    Job.find({ ...stateFilter, status: 'filled', closedAt: range }).select('closedAt state filledThroughNiqs').lean(),
    JobApplication.find({ createdAt: range }).populate('job', 'state').select('createdAt job').lean(),
    Job.find({ ...stateFilter, 'featured.paidAt': range, 'featured.amount': { $gt: 0 } }).select('featured state').lean(),
    Job.find({ ...stateFilter, 'listingFee.paidAt': range, 'listingFee.amount': { $gt: 0 } }).select('listingFee state').lean(),
    Employer.find({ 'package.paidAt': range, 'package.amountPaid': { $gt: 0 }, ...(query.state ? { state: query.state } : {}) }).select('package state').lean(),
  ]);

  posted.forEach((j) => bump(monthKey(j.createdAt), j.state, 'posted'));
  published.forEach((j) => bump(monthKey(j.publishedAt), j.state, 'published'));
  filled.forEach((j) => {
    bump(monthKey(j.closedAt), j.state, 'filled');
    if (j.filledThroughNiqs) bump(monthKey(j.closedAt), j.state, 'filledThroughNiqs');
  });
  apps.forEach((a) => {
    if (query.state && a.job?.state !== query.state) return;
    bump(monthKey(a.createdAt), a.job?.state, 'applications');
  });
  featuredPaid.forEach((j) => bump(monthKey(j.featured.paidAt), j.state, 'income', j.featured.amount));
  feesPaid.forEach((j) => bump(monthKey(j.listingFee.paidAt), j.state, 'income', j.listingFee.amount));
  employers.forEach((e) => bump(monthKey(e.package.paidAt), e.state, 'income', e.package.amountPaid));

  const totals = Object.values(byMonth).reduce((t, r) => {
    for (const k of Object.keys(t)) t[k] += r[k];
    return t;
  }, blank());

  const [live, pendingListings, pendingEmployers, approvedEmployers] = await Promise.all([
    Job.countDocuments({ status: 'published' }),
    Job.countDocuments({ status: 'pending' }),
    Employer.countDocuments({ status: 'pending' }),
    Employer.countDocuments({ status: 'approved' }),
  ]);

  return {
    from: months[0], to: months[months.length - 1],
    months: months.map((m) => ({ month: m, ...byMonth[m] })),
    states: Object.entries(byState).map(([state, r]) => ({ state, ...r })).sort((a, b) => b.posted - a.posted),
    totals,
    now: { live, pendingListings, pendingEmployers, approvedEmployers },
  };
}

exports.reports = async (req, res) => {
  try {
    res.json(await buildReport(req.query));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/** GET /api/job-admin/reports.csv: the month table as CSV. */
exports.reportsCsv = async (req, res) => {
  try {
    const data = await buildReport(req.query);
    const head = 'month,posted,published,applications,filled,filled_through_niqs,income_ngn';
    const lines = data.months.map((m) => [m.month, m.posted, m.published, m.applications, m.filled, m.filledThroughNiqs, m.income].join(','));
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="niqs-job-board-${data.from}-to-${data.to}.csv"`);
    res.send([head, ...lines].join('\n'));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ═════════════ Settings ═════════════ */

const SETTING_FIELDS = [
  'moderatorEmails', 'approvalTargetHours', 'standardListingFee', 'featuredFee', 'featuredDays',
  'paymentInstructions', 'nonMembersCanApply', 'requireRegisterCheck', 'retentionDays',
  'talentSearchEnabled', 'packages',
];

exports.getSettings = async (req, res) => {
  res.json({ settings: await JobBoardSettings.get() });
};

exports.updateSettings = async (req, res) => {
  try {
    const s = await JobBoardSettings.get();
    for (const f of SETTING_FIELDS) {
      if (req.body[f] === undefined) continue;
      let v = req.body[f];
      if (f === 'moderatorEmails') {
        v = (Array.isArray(v) ? v : String(v).split(/[,\s]+/)).map((x) => String(x).trim().toLowerCase()).filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
      }
      if (['approvalTargetHours', 'standardListingFee', 'featuredFee', 'featuredDays', 'retentionDays'].includes(f)) v = Math.max(0, Number(v) || 0);
      if (f === 'retentionDays') v = Math.min(730, Math.max(30, v));
      if (f === 'featuredDays') v = Math.max(1, v);
      s[f] = v;
    }
    await s.save();
    res.json({ settings: s });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
