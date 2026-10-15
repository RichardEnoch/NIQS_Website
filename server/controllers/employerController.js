/**
 * Employer accounts: sign-up, sign-in, profile and password reset.
 *
 * Registration creates a 'pending' account and tells the Secretariat. The
 * employer can sign in straight away and draft listings, but nothing goes to
 * the moderation queue until the account itself is approved.
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Employer = require('../models/Employer');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const JobBoardSettings = require('../models/JobBoardSettings');
const { publicBase } = require('../utils/email');
const { notifyModeratorsEmployer, employerResetEmail } = require('../utils/jobMail');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function issueToken(res, employer) {
  const token = jwt.sign({ id: employer._id, kind: 'employer' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
}

/* Fields an employer may set on their own account. Status, flags, the QS firm
   link and packages are the Secretariat's. */
const SELF_FIELDS = ['companyName', 'contactName', 'contactRole', 'phone', 'website', 'logo', 'address', 'state', 'sector', 'rcNumber', 'about'];

function pick(body, fields) {
  const out = {};
  for (const f of fields) if (body[f] !== undefined) out[f] = typeof body[f] === 'string' ? body[f].trim() : body[f];
  return out;
}

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = pick(req.body, SELF_FIELDS);
    if (!data.companyName || !data.contactName) {
      return res.status(400).json({ message: 'Company name and contact name are required' });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    if (!req.body.acceptTerms) {
      return res.status(400).json({ message: 'Please accept the job board terms to continue' });
    }
    const exists = await Employer.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: 'An employer account already exists for that email' });

    const employer = await Employer.create({ ...data, email, password, status: 'pending' });
    const token = issueToken(res, employer);

    JobBoardSettings.get().then((s) => notifyModeratorsEmployer(s, employer)).catch(() => {});
    res.status(201).json({ token, employer });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const employer = await Employer.findOne({ email: String(email).toLowerCase().trim() });
    if (!employer || !(await employer.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (employer.status === 'rejected') {
      return res.status(403).json({ message: employer.statusNote || 'This employer account was not approved. Please contact the NIQS Secretariat.' });
    }
    employer.lastLogin = new Date();
    await employer.save();
    const token = issueToken(res, employer);
    res.json({ token, employer });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.me = async (req, res) => {
  const employer = await Employer.findById(req.employer._id).populate('qsFirm', 'name state regNumber');
  res.json({ employer });
};

exports.updateMe = async (req, res) => {
  try {
    const employer = await Employer.findById(req.employer._id);
    Object.assign(employer, pick(req.body, SELF_FIELDS));
    await employer.save();
    await employer.populate('qsFirm', 'name state regNumber');
    res.json({ employer });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const employer = await Employer.findById(req.employer._id);
    if (!(await employer.comparePassword(currentPassword || ''))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }
    employer.password = newPassword;
    await employer.save();
    res.json({ message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/** Dashboard numbers for the signed-in employer. */
exports.summary = async (req, res) => {
  try {
    const id = req.employer._id;
    const [byStatus, apps, newApps, settings] = await Promise.all([
      Job.aggregate([{ $match: { employer: id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      JobApplication.countDocuments({ employer: id, status: { $ne: 'withdrawn' } }),
      JobApplication.countDocuments({ employer: id, status: 'submitted' }),
      JobBoardSettings.get(),
    ]);
    const listings = Object.fromEntries(byStatus.map((r) => [r._id, r.n]));
    const pkg = req.employer.package || {};
    res.json({
      status: req.employer.status,
      statusNote: req.employer.statusNote,
      listings,
      applications: apps,
      unread: newApps,
      package: req.employer.hasActivePackage()
        ? { ...pkg.toObject?.() ?? pkg, featuredRemaining: Math.max(0, (pkg.featuredQuota || 0) - (pkg.featuredUsed || 0)) }
        : null,
      pricing: {
        standardListingFee: settings.standardListingFee,
        featuredFee: settings.featuredFee,
        featuredDays: settings.featuredDays,
        paymentInstructions: settings.paymentInstructions,
        approvalTargetHours: settings.approvalTargetHours,
        packages: settings.packages,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/** Public: prices, packages and approval time, for the "For employers" page. */
exports.publicInfo = async (req, res) => {
  try {
    const s = await JobBoardSettings.get();
    res.json({
      standardListingFee: s.standardListingFee,
      featuredFee: s.featuredFee,
      featuredDays: s.featuredDays,
      approvalTargetHours: s.approvalTargetHours,
      packages: s.packages,
      nonMembersCanApply: s.nonMembersCanApply,
      retentionDays: s.retentionDays,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const generic = { message: 'If an employer account exists for that email, a reset link has been sent.' };
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    if (!email) return res.json(generic);
    const employer = await Employer.findOne({ email });
    if (!employer) return res.json(generic);

    const raw = crypto.randomBytes(32).toString('hex');
    employer.resetPasswordToken = crypto.createHash('sha256').update(raw).digest('hex');
    employer.resetPasswordExpires = Date.now() + 30 * 60 * 1000;
    await employer.save();

    const base = (publicBase() || req.headers.origin || '').replace(/\/$/, '');
    await employerResetEmail(employer, `${base}/reset-password/${raw}?type=employer`);
    res.json(generic);
  } catch (error) {
    res.json(generic);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const employer = await Employer.findOne({ resetPasswordToken: hashed, resetPasswordExpires: { $gt: Date.now() } });
    if (!employer) return res.status(400).json({ message: 'This reset link is invalid or has expired' });
    if (!req.body.password || req.body.password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    employer.password = req.body.password;
    employer.resetPasswordToken = undefined;
    employer.resetPasswordExpires = undefined;
    await employer.save();
    res.json({ message: 'Password reset. You can now sign in.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
