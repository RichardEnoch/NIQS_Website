/**
 * Job board work that is not tied to one request: checking an applicant
 * against the register, sending job alerts, and the daily housekeeping that
 * closes expired listings, ends featured placements and purges old applicant
 * data.
 */
const Job = require('../models/Job');
const JobAlert = require('../models/JobAlert');
const JobApplication = require('../models/JobApplication');
const JobFile = require('../models/JobFile');
const CareerProfile = require('../models/CareerProfile');
const JobBoardSettings = require('../models/JobBoardSettings');
const Member = require('../models/Member');
const portal = require('./portalClient');
const { GRADE_LABELS, meetsGrade, escapeRegex } = require('./jobBoard');
const { jobAlertEmail } = require('./jobMail');

/**
 * What the employer is told about an applicant's membership.
 *
 * Only the membership portal's register counts as verified. Its record must
 * carry the same email as the website account, so a member cannot borrow
 * someone else's membership number. Until the portal API is connected, the
 * website's own records are reported as "recorded on niqs.org.ng", never as
 * verified.
 */
async function verifyApplicant(user) {
  const checkedAt = new Date();
  const email = String(user.email || '').toLowerCase();

  if (portal.isConfigured()) {
    const member = user.membershipId
      ? await portal.verifyMember({ membershipNumber: user.membershipId })
      : await portal.verifyMember({ email });
    if (member && String(member.email || '').toLowerCase() === email) {
      return {
        verified: true,
        source: 'register',
        membershipNumber: member.membershipNumber || user.membershipId || '',
        grade: member.membershipType || '',
        gradeLabel: GRADE_LABELS[member.membershipType] || member.membershipType || '',
        goodStanding: member.status === 'active',
        checkedAt,
      };
    }
  }

  const record = await Member.findOne({ user: user._id }).lean();
  const grade = record?.membershipType || user.membershipType || '';
  return {
    verified: false,
    source: user.membershipId || record ? 'website' : 'none',
    membershipNumber: record?.registrationNumber || user.membershipId || '',
    grade,
    gradeLabel: GRADE_LABELS[grade] || grade,
    goodStanding: record ? (record.status === 'active' && record.paymentStatus === 'paid') : undefined,
    checkedAt,
  };
}

/** Does a published listing match a saved alert? (grade checked separately) */
function alertMatches(alert, job) {
  if (alert.states.length && !alert.states.includes(job.state)) return false;
  if (alert.sectors.length && !alert.sectors.includes(job.sector)) return false;
  if (alert.types.length && !alert.types.includes(job.type)) return false;
  if (alert.tracks.length && !alert.tracks.includes(job.track)) return false;
  if (alert.keywords) {
    const words = alert.keywords.split(/[,\s]+/).filter(Boolean);
    const hay = `${job.title} ${job.company} ${job.description}`;
    if (words.length && !words.some((w) => new RegExp(escapeRegex(w), 'i').test(hay))) return false;
  }
  return true;
}

/**
 * Email every member whose alert matches a newly published listing. Runs once
 * per listing (alertsSentAt), after the response has gone, so a slow SMTP
 * server never holds up the admin's approve click.
 */
async function dispatchAlertsForJob(jobId) {
  try {
    const job = await Job.findOneAndUpdate(
      { _id: jobId, status: 'published', alertsSentAt: { $exists: false } },
      { $set: { alertsSentAt: new Date() } },
      { new: true },
    );
    if (!job) return { sent: 0 };

    const alerts = await JobAlert.find({ active: true }).populate('user', 'email firstName membershipType');
    let sent = 0;
    const seen = new Set();
    for (const alert of alerts) {
      if (!alert.user || seen.has(String(alert.user._id))) continue;
      if (!alertMatches(alert, job)) continue;
      if (alert.matchMyGrade && !meetsGrade(alert.user.membershipType, job.minGrade)) continue;
      seen.add(String(alert.user._id));
      const r = await jobAlertEmail(alert.user, alert, [job]);
      alert.lastSentAt = new Date();
      alert.sentCount += 1;
      await alert.save();
      if (r.sent) sent += 1;
    }
    return { sent, matched: seen.size };
  } catch (err) {
    console.error('[jobBoard] alert dispatch failed:', err.message);
    return { sent: 0, error: err.message };
  }
}

/** Delete applications (and their CVs) for listings past their retention date. */
async function purgeExpiredApplicantData(now = new Date()) {
  const jobs = await Job.find({ purgeAfter: { $lte: now } }).select('_id').lean();
  if (!jobs.length) return { jobs: 0, applications: 0, files: 0 };
  const ids = jobs.map((j) => j._id);

  const apps = await JobApplication.find({ job: { $in: ids } }).select('cv').lean();
  const cvIds = apps.map((a) => a.cv).filter(Boolean);

  // A CV still attached to the member's own career profile is theirs to keep.
  const kept = new Set(
    (await CareerProfile.find({ cv: { $in: cvIds } }).select('cv').lean()).map((p) => String(p.cv)),
  );
  // ...and so is one they used on another application that is still live.
  const stillUsed = new Set(
    (await JobApplication.find({ cv: { $in: cvIds }, job: { $nin: ids } }).select('cv').lean()).map((a) => String(a.cv)),
  );
  const toDelete = cvIds.filter((id) => !kept.has(String(id)) && !stillUsed.has(String(id)));

  const files = toDelete.length ? (await JobFile.deleteMany({ _id: { $in: toDelete } })).deletedCount : 0;
  const removed = (await JobApplication.deleteMany({ job: { $in: ids } })).deletedCount;
  await Job.updateMany({ _id: { $in: ids } }, { $unset: { purgeAfter: 1 } });
  return { jobs: ids.length, applications: removed, files };
}

/** Set the purge date on a listing that has just closed or filled. */
async function scheduleRetention(job) {
  const settings = await JobBoardSettings.get();
  const days = Math.max(1, Number(settings.retentionDays) || 180);
  job.purgeAfter = new Date(Date.now() + days * 86_400_000);
}

async function housekeeping() {
  const now = new Date();
  try {
    // Listings past their deadline close themselves.
    const expired = await Job.find({ status: 'published', deadline: { $lt: now } });
    for (const job of expired) {
      job.status = 'closed';
      job.closedAt = now;
      await scheduleRetention(job);
      await job.save();
    }
    // Featured placements end on their date.
    await Job.updateMany(
      { 'featured.active': true, 'featured.until': { $lt: now } },
      { $set: { 'featured.active': false } },
    );
    const purged = await purgeExpiredApplicantData(now);
    if (expired.length || purged.applications) {
      console.log(`[jobBoard] closed ${expired.length} expired listing(s); purged ${purged.applications} application(s), ${purged.files} CV(s)`);
    }
  } catch (err) {
    console.error('[jobBoard] housekeeping failed:', err.message);
  }
}

/**
 * Listings created before the status field existed have none; give them the
 * one their old isActive flag implied. Idempotent.
 */
async function backfillStatus() {
  try {
    await Job.updateMany({ status: { $exists: false }, isActive: { $ne: false } }, { $set: { status: 'published', applyMethod: 'external' } });
    await Job.updateMany({ status: { $exists: false } }, { $set: { status: 'paused', applyMethod: 'external' } });
  } catch (err) {
    console.error('[jobBoard] status backfill failed:', err.message);
  }
}

/**
 * Start the background work. Each ECS task runs it, so every step is safe to
 * run twice at once: updates are conditional and deletes are idempotent.
 */
function start() {
  if (process.env.JOB_BOARD_HOUSEKEEPING === 'off') return;
  const mongoose = require('mongoose');
  const kick = () => { backfillStatus().then(housekeeping); };
  if (mongoose.connection.readyState === 1) kick();
  else mongoose.connection.once('connected', kick);
  const timer = setInterval(housekeeping, 6 * 60 * 60 * 1000); // every 6 hours
  timer.unref();
}

module.exports = {
  verifyApplicant, dispatchAlertsForJob, alertMatches,
  purgeExpiredApplicantData, scheduleRetention, housekeeping, backfillStatus, start,
};
