/**
 * The people side of the job board.
 *
 *   Members:   CVs, applying, the application tracker, saved jobs, alerts,
 *              and their career profile.
 *   Employers: the applicant inbox, and talent search over profiles that
 *              members have chosen to make visible.
 *
 * Privacy rule throughout: an applicant's personal details reach only the
 * employer they applied to. Talent search shows a profile, never contact
 * details; an employer reaches a member by inviting them, and the member
 * decides whether to apply.
 */
const mongoose = require('mongoose');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const JobFile = require('../models/JobFile');
const JobAlert = require('../models/JobAlert');
const CareerProfile = require('../models/CareerProfile');
const JobBoardSettings = require('../models/JobBoardSettings');
const { verifyApplicant } = require('../utils/jobBoardService');
const { meetsGrade, GRADE_LABELS, gradesAtOrAbove, escapeRegex, APPLICATION_STATUSES, SECTOR_LABELS } = require('../utils/jobBoard');
const { newApplicationEmail, applicationStatusEmail } = require('../utils/jobMail');
const { sendMail, publicBase } = require('../utils/email');

const isId = (v) => mongoose.Types.ObjectId.isValid(v);
const fullName = (u) => `${u.firstName || ''} ${u.lastName || ''}`.trim();

/* ═════════════ CV files ═════════════ */

const CV_TYPES = {
  'application/pdf': { ext: /\.pdf$/i, magic: (b) => b.slice(0, 4).toString() === '%PDF' },
  'application/msword': { ext: /\.doc$/i, magic: (b) => b.slice(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0])) },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: /\.docx$/i, magic: (b) => b.slice(0, 2).toString() === 'PK' },
};
const CV_MAX = 2 * 1024 * 1024;

/** POST /api/careers/cv (multipart "file"): PDF or Word, up to 2 MB. */
exports.uploadCv = async (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ message: 'Choose a CV file to upload' });
    const rule = CV_TYPES[f.mimetype];
    if (!rule || !rule.ext.test(f.originalname) || !rule.magic(f.buffer)) {
      return res.status(400).json({ message: 'Upload your CV as a PDF or Word document' });
    }
    if (f.size > CV_MAX) return res.status(400).json({ message: 'CV files must be 2 MB or smaller' });
    const doc = await JobFile.create({
      owner: req.user._id,
      filename: f.originalname.replace(/[^\w.\- ()]/g, '_').slice(0, 120),
      mimetype: f.mimetype,
      size: f.size,
      data: f.buffer,
    });
    res.status(201).json({ _id: doc._id, filename: doc.filename, size: doc.size, createdAt: doc.createdAt });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
};

/** GET /api/careers/cv: the member's own uploaded CVs (no file bodies). */
exports.myCvs = async (req, res) => {
  const files = await JobFile.find({ owner: req.user._id }).select('filename size createdAt').sort('-createdAt');
  res.json({ files });
};

/**
 * GET /api/careers/files/:id: stream a CV, if the caller may read it:
 * its owner, an admin, an employer the member applied to with it, or an
 * approved employer viewing a profile the member has made visible.
 */
exports.downloadFile = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'File not found' });
    const file = await JobFile.findById(req.params.id).select('+data');
    if (!file) return res.status(404).json({ message: 'File not found' });

    let allowed = Boolean(req.admin) || Boolean(req.user && String(file.owner) === String(req.user._id));
    if (!allowed && req.employer) {
      allowed = Boolean(await JobApplication.exists({ cv: file._id, employer: req.employer._id, status: { $ne: 'withdrawn' } }));
      if (!allowed && req.employer.status === 'approved') {
        const s = await JobBoardSettings.get();
        allowed = s.talentSearchEnabled && Boolean(await CareerProfile.exists({ cv: file._id, visibleToEmployers: true }));
      }
    }
    if (!allowed) return res.status(403).json({ message: 'You do not have access to this file' });

    res.set('Content-Type', file.mimetype);
    res.set('Content-Length', String(file.data.length));
    res.set('Content-Disposition', `attachment; filename="${file.filename.replace(/"/g, '')}"`);
    res.set('Cache-Control', 'private, no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    res.send(file.data);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteCv = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'File not found' });
    const file = await JobFile.findOne({ _id: req.params.id, owner: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found' });
    const inUse = await JobApplication.exists({ cv: file._id, status: { $nin: ['withdrawn', 'not_selected', 'hired'] } });
    if (inUse) return res.status(400).json({ message: 'This CV is attached to an open application. Withdraw the application first.' });
    await CareerProfile.updateOne({ user: req.user._id, cv: file._id }, { $unset: { cv: 1 } });
    await file.deleteOne();
    res.json({ message: 'CV deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ═════════════ Membership check ═════════════ */

/** GET /api/careers/verification: what an employer would be shown about me. */
exports.myVerification = async (req, res) => {
  try {
    res.json({ verification: await verifyApplicant(req.user) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ═════════════ Applying ═════════════ */

/**
 * POST /api/jobs/:id/apply { coverNote, cv, phone, shareProfile }
 * Checks the applicant against the register and the listing's rules before
 * accepting, and records exactly what was checked.
 */
exports.apply = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Job not found' });
    const job = await Job.findById(req.params.id).populate('employer');
    if (!job || job.status !== 'published') return res.status(404).json({ message: 'This listing is not open for applications' });
    if (job.applyMethod === 'external') return res.status(400).json({ message: 'This employer takes applications on their own site', applicationLink: job.applicationLink });
    if (job.deadline && new Date(job.deadline) < new Date()) return res.status(400).json({ message: 'The closing date for this listing has passed' });

    const existing = await JobApplication.findOne({ job: job._id, applicant: req.user._id });
    if (existing && existing.status !== 'withdrawn') return res.status(409).json({ message: 'You have already applied for this role', application: existing });

    const settings = await JobBoardSettings.get();
    const verification = await verifyApplicant(req.user);
    const isMember = verification.source !== 'none';

    if ((job.membersOnly || !settings.nonMembersCanApply) && !isMember) {
      return res.status(403).json({ message: 'This role is open to NIQS members only. Add your membership number to your profile to apply.', code: 'members_only' });
    }
    if (settings.requireRegisterCheck && !verification.verified) {
      return res.status(403).json({ message: 'We could not confirm your membership on the NIQS register, so this application cannot be sent yet.', code: 'register_check' });
    }
    if (job.minGrade && job.minGrade !== 'none' && !meetsGrade(verification.grade, job.minGrade)) {
      return res.status(403).json({ message: `This role asks for at least ${GRADE_LABELS[job.minGrade]}.`, code: 'grade' });
    }

    let cv;
    if (req.body.cv) {
      if (!isId(req.body.cv)) return res.status(400).json({ message: 'Invalid CV' });
      const f = await JobFile.findOne({ _id: req.body.cv, owner: req.user._id }).select('_id');
      if (!f) return res.status(400).json({ message: 'Upload your CV again' });
      cv = f._id;
    }
    let shareProfile = Boolean(req.body.shareProfile);
    if (shareProfile && !(await CareerProfile.exists({ user: req.user._id }))) shareProfile = false;
    if (!cv && !shareProfile && !String(req.body.coverNote || '').trim()) {
      return res.status(400).json({ message: 'Attach a CV, share your profile, or write a note to the employer' });
    }

    const data = {
      job: job._id,
      employer: job.employer?._id,
      applicant: req.user._id,
      fullName: fullName(req.user),
      email: req.user.email,
      phone: String(req.body.phone || req.user.phone || '').trim(),
      coverNote: String(req.body.coverNote || '').trim().slice(0, 4000),
      cv, shareProfile, verification,
      status: 'submitted',
      viewedAt: undefined,
      employerNote: '',
    };
    let application;
    if (existing) {
      // Re-applying after withdrawing reopens the same record.
      Object.assign(existing, data);
      existing.history.push({ status: 'submitted', by: 'applicant', note: 'Re-applied' });
      application = await existing.save();
    } else {
      application = await JobApplication.create({ ...data, history: [{ status: 'submitted', by: 'applicant' }] });
    }
    await Job.updateOne({ _id: job._id }, { $set: { applicationCount: await JobApplication.countDocuments({ job: job._id, status: { $ne: 'withdrawn' } }) } });

    if (job.employer) newApplicationEmail(job, job.employer, application).catch(() => {});
    res.status(201).json({ application });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You have already applied for this role' });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/** GET /api/careers/applications: the member's tracker. */
exports.myApplications = async (req, res) => {
  try {
    const apps = await JobApplication.find({ applicant: req.user._id })
      .populate('job', 'title company location state status deadline type track')
      .populate('cv', 'filename')
      .select('-employerNote')
      .sort('-createdAt');
    res.json({ applications: apps });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.withdraw = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Application not found' });
    const app = await JobApplication.findOne({ _id: req.params.id, applicant: req.user._id });
    if (!app) return res.status(404).json({ message: 'Application not found' });
    if (['withdrawn', 'hired'].includes(app.status)) return res.status(400).json({ message: 'This application cannot be withdrawn' });
    app.status = 'withdrawn';
    app.history.push({ status: 'withdrawn', by: 'applicant' });
    await app.save();
    await Job.updateOne({ _id: app.job }, { $set: { applicationCount: await JobApplication.countDocuments({ job: app.job, status: { $ne: 'withdrawn' } }) } });
    res.json({ application: app });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ═════════════ Saved jobs ═════════════ */

async function profileFor(userId) {
  return (await CareerProfile.findOne({ user: userId })) || new CareerProfile({ user: userId });
}

/** Middleware: attach the member's saved job ids so listings can show a filled star. */
exports.attachSaved = async (req, res, next) => {
  if (!req.user) return next();
  try {
    const p = await CareerProfile.findOne({ user: req.user._id }).select('savedJobs').lean();
    req.savedIds = new Set((p?.savedJobs || []).map(String));
  } catch (_) { /* a listing without stars is fine */ }
  next();
};

exports.savedJobs = async (req, res) => {
  try {
    const p = await CareerProfile.findOne({ user: req.user._id }).populate({
      path: 'savedJobs',
      select: 'title company location state status deadline type track salary logo featured',
    });
    res.json({ jobs: (p?.savedJobs || []).filter(Boolean) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.saveJob = async (req, res) => {
  try {
    if (!isId(req.params.jobId) || !(await Job.exists({ _id: req.params.jobId }))) return res.status(404).json({ message: 'Job not found' });
    const p = await profileFor(req.user._id);
    if (!p.savedJobs.map(String).includes(req.params.jobId)) p.savedJobs.push(req.params.jobId);
    await p.save();
    res.json({ saved: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.unsaveJob = async (req, res) => {
  try {
    await CareerProfile.updateOne({ user: req.user._id }, { $pull: { savedJobs: req.params.jobId } });
    res.json({ saved: false });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ═════════════ Alerts ═════════════ */

const ALERT_FIELDS = ['name', 'states', 'sectors', 'types', 'tracks', 'keywords', 'matchMyGrade', 'active'];
function pickAlert(body) {
  const out = {};
  for (const f of ALERT_FIELDS) {
    if (body[f] === undefined) continue;
    out[f] = Array.isArray(body[f]) ? body[f].map(String).slice(0, 40) : body[f];
  }
  return out;
}

exports.listAlerts = async (req, res) => {
  res.json({ alerts: await JobAlert.find({ user: req.user._id }).sort('-createdAt') });
};

exports.createAlert = async (req, res) => {
  try {
    if ((await JobAlert.countDocuments({ user: req.user._id })) >= 10) {
      return res.status(400).json({ message: 'You can keep up to 10 alerts. Delete one to add another.' });
    }
    const alert = await JobAlert.create({ ...pickAlert(req.body), user: req.user._id });
    res.status(201).json({ alert });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateAlert = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Alert not found' });
    const alert = await JobAlert.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, pickAlert(req.body), { new: true, runValidators: true });
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json({ alert });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteAlert = async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Alert not found' });
  await JobAlert.deleteOne({ _id: req.params.id, user: req.user._id });
  res.json({ message: 'Alert deleted' });
};

/* ═════════════ Career profile ═════════════ */

const PROFILE_FIELDS = ['headline', 'summary', 'state', 'yearsExperience', 'sectors', 'skills', 'qualifications', 'cv', 'visibleToEmployers', 'openToWork', 'seekingPlacement', 'institution'];

exports.getProfile = async (req, res) => {
  try {
    const p = await CareerProfile.findOne({ user: req.user._id }).populate('cv', 'filename size createdAt');
    res.json({ profile: p || null });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const p = await profileFor(req.user._id);
    for (const f of PROFILE_FIELDS) {
      if (req.body[f] === undefined) continue;
      let v = req.body[f];
      if (f === 'skills' || f === 'sectors') v = (Array.isArray(v) ? v : String(v).split(',')).map((s) => String(s).trim()).filter(Boolean).slice(0, 30);
      if (f === 'cv') {
        if (!v) { p.cv = undefined; continue; }
        if (!isId(v) || !(await JobFile.exists({ _id: v, owner: req.user._id }))) return res.status(400).json({ message: 'Upload your CV again' });
      }
      p[f] = v;
    }
    await p.save();
    await p.populate('cv', 'filename size createdAt');
    res.json({ profile: p });
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ═════════════ Employer: applicant inbox ═════════════ */

function shapeForEmployer(app, profile) {
  const o = app.toObject ? app.toObject() : app;
  return {
    _id: o._id, job: o.job, fullName: o.fullName, email: o.email, phone: o.phone,
    coverNote: o.coverNote, cv: o.cv, verification: o.verification, status: o.status,
    history: o.history, employerNote: o.employerNote, viewedAt: o.viewedAt, createdAt: o.createdAt,
    profile: o.shareProfile && profile ? {
      headline: profile.headline, summary: profile.summary, state: profile.state,
      yearsExperience: profile.yearsExperience, sectors: profile.sectors, skills: profile.skills,
      qualifications: profile.qualifications,
    } : null,
  };
}

/** GET /api/careers/inbox?job=&status= (withdrawn applications are hidden) */
exports.inbox = async (req, res) => {
  try {
    const filter = { employer: req.employer._id, status: { $ne: 'withdrawn' } };
    if (req.query.job && isId(req.query.job)) filter.job = req.query.job;
    if (req.query.status && APPLICATION_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.verified === '1') filter['verification.verified'] = true;
    const apps = await JobApplication.find(filter)
      .populate('job', 'title location status')
      .populate('cv', 'filename size')
      .sort('-createdAt')
      .limit(500);
    const profiles = await CareerProfile.find({ user: { $in: apps.filter((a) => a.shareProfile).map((a) => a.applicant) } }).lean();
    const byUser = new Map(profiles.map((p) => [String(p.user), p]));
    res.json({ applications: apps.map((a) => shapeForEmployer(a, byUser.get(String(a.applicant)))) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/** GET /api/careers/inbox/:id (opening an application marks it viewed) */
exports.inboxItem = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Application not found' });
    const app = await JobApplication.findOne({ _id: req.params.id, employer: req.employer._id, status: { $ne: 'withdrawn' } })
      .populate('job', 'title company location status')
      .populate('cv', 'filename size');
    if (!app) return res.status(404).json({ message: 'Application not found' });
    if (app.status === 'submitted') {
      app.status = 'viewed';
      app.viewedAt = new Date();
      app.history.push({ status: 'viewed', by: 'employer' });
      await app.save();
      applicationStatusEmail(app, app.job).catch(() => {});
    }
    const profile = app.shareProfile ? await CareerProfile.findOne({ user: app.applicant }).lean() : null;
    res.json({ application: shapeForEmployer(app, profile) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/** PUT /api/careers/inbox/:id { status, note, employerNote } */
exports.updateInboxItem = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Application not found' });
    const app = await JobApplication.findOne({ _id: req.params.id, employer: req.employer._id, status: { $ne: 'withdrawn' } }).populate('job', 'title company');
    if (!app) return res.status(404).json({ message: 'Application not found' });

    const { status } = req.body;
    if (req.body.employerNote !== undefined) app.employerNote = String(req.body.employerNote).slice(0, 2000);
    let changed = false;
    if (status && status !== app.status) {
      if (!APPLICATION_STATUSES.includes(status) || ['submitted', 'withdrawn'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      app.status = status;
      app.history.push({ status, by: 'employer', note: String(req.body.note || '').slice(0, 500) });
      changed = true;
    }
    await app.save();
    if (changed) applicationStatusEmail(app, app.job).catch(() => {});
    const profile = app.shareProfile ? await CareerProfile.findOne({ user: app.applicant }).lean() : null;
    res.json({ application: shapeForEmployer(app, profile) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ═════════════ Talent search ═════════════ */

/**
 * GET /api/careers/talent?q=&state=&sector=&minGrade=&placement=1
 * Profiles members have made visible. No email or phone: an employer
 * reaches a member through an invitation (below).
 */
exports.talent = async (req, res) => {
  try {
    const s = await JobBoardSettings.get();
    if (!s.talentSearchEnabled && !req.admin) return res.status(403).json({ message: 'Talent search is switched off' });

    const filter = { visibleToEmployers: true };
    if (req.query.state) filter.state = req.query.state;
    if (req.query.sector) filter.sectors = req.query.sector;
    if (req.query.placement === '1') filter.seekingPlacement = true;
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
      filter.$or = [{ headline: rx }, { summary: rx }, { skills: rx }, { qualifications: rx }];
    }
    const profiles = await CareerProfile.find(filter)
      .populate('user', 'firstName lastName membershipType')
      .populate('cv', 'filename')
      .sort('-updatedAt')
      .limit(200)
      .lean();

    const allowedGrades = req.query.minGrade && req.query.minGrade !== 'none' ? new Set(gradesAtOrAbove(req.query.minGrade)) : null;
    const rows = profiles
      .filter((p) => p.user && (!allowedGrades || allowedGrades.has(p.user.membershipType)))
      .map((p) => ({
        _id: p._id,
        name: fullName(p.user),
        grade: p.user.membershipType, gradeLabel: GRADE_LABELS[p.user.membershipType] || '',
        headline: p.headline, summary: p.summary, state: p.state, yearsExperience: p.yearsExperience,
        sectors: p.sectors, sectorLabels: (p.sectors || []).map((x) => SECTOR_LABELS[x] || x),
        skills: p.skills, qualifications: p.qualifications, openToWork: p.openToWork,
        seekingPlacement: p.seekingPlacement, institution: p.institution,
        cv: p.cv ? { _id: p.cv._id, filename: p.cv.filename } : null,
        updatedAt: p.updatedAt,
      }));
    res.json({ profiles: rows });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/** POST /api/careers/talent/:id/invite { job, message }: email the member a listing. */
exports.inviteTalent = async (req, res) => {
  try {
    if (!isId(req.params.id) || !isId(req.body.job)) return res.status(400).json({ message: 'Choose a listing to invite them to' });
    const s = await JobBoardSettings.get();
    if (!s.talentSearchEnabled) return res.status(403).json({ message: 'Talent search is switched off' });
    const profile = await CareerProfile.findOne({ _id: req.params.id, visibleToEmployers: true }).populate('user', 'email firstName');
    if (!profile?.user) return res.status(404).json({ message: 'Profile not found' });
    const job = await Job.findOne({ _id: req.body.job, employer: req.employer._id, status: 'published' });
    if (!job) return res.status(400).json({ message: 'You can only invite people to one of your live listings' });

    const base = publicBase() || 'https://niqs.org.ng';
    const msg = String(req.body.message || '').trim().slice(0, 1000).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const r = await sendMail({
      to: profile.user.email,
      subject: `${req.employer.companyName} invites you to apply: ${job.title}`,
      html: `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a2e;">
        <p style="color:#D9B650;font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:12px;">NIQS Job Board</p>
        <h2 style="color:#000066;">Hi ${profile.user.firstName}, ${req.employer.companyName} would like you to apply</h2>
        <p>They found your career profile on the NIQS job board and invited you to apply for <strong>${job.title}</strong> (${job.location}).</p>
        ${msg ? `<blockquote style="border-left:3px solid #D9B650;margin:12px 0;padding:6px 12px;color:#5A6485;">${msg}</blockquote>` : ''}
        <p>Your contact details have not been shared. If you are interested, apply through the listing.</p>
        <p><a href="${base}/jobs/${job._id}" style="background:#D9B650;color:#000066;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;">View the role</a></p>
        <p style="font-size:11px;color:#8892B0;">You are receiving this because your career profile is visible to employers. Turn that off under Member Portal → Career Profile.</p>
      </div>`,
    });
    res.json({ sent: Boolean(r.sent), message: r.sent ? 'Invitation sent' : 'Invitation recorded, but email is not configured on this server yet' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ═════════════ Admin ═════════════ */

/** GET /api/careers/admin/applications?job= (support view; includes employer notes) */
exports.adminApplications = async (req, res) => {
  try {
    const filter = {};
    if (req.query.job && isId(req.query.job)) filter.job = req.query.job;
    const apps = await JobApplication.find(filter)
      .populate('job', 'title company')
      .populate('cv', 'filename')
      .sort('-createdAt')
      .limit(500);
    res.json({ applications: apps });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
