/**
 * Job board emails. Every send goes through utils/email.js, so with SMTP unset
 * they log and no-op, and nothing here ever throws into a request: a failed
 * notification must not fail the action that caused it.
 */
const { sendMail, publicBase, fmtDate } = require('./email');

const NAVY = '#000066', GOLD = '#D9B650';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function link(path) {
  return `${publicBase() || 'https://niqs.org.ng'}${path}`;
}

/** The shared navy/gold frame. `body` is trusted HTML built in this file. */
function frame({ kicker, greeting, heading, body, cta, footer = 'NIQS Job Board · niqs.org.ng' }) {
  return `
  <div style="margin:0;padding:24px;background:#ECEEF5;font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,102,.12);">
      <div style="background:${NAVY};padding:20px 28px;color:#fff;">
        <p style="margin:0;font-size:12px;letter-spacing:.16em;color:${GOLD};font-weight:700;text-transform:uppercase;">Nigerian Institute of Quantity Surveyors</p>
        <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.75);">${esc(kicker)}</p>
      </div>
      <div style="padding:28px;">
        ${greeting ? `<p style="margin:0 0 4px;font-size:14px;color:#5A6485;">${esc(greeting)}</p>` : ''}
        <h1 style="margin:0 0 14px;font-size:21px;line-height:1.25;color:${NAVY};">${esc(heading)}</h1>
        <div style="font-size:14px;color:#5A6485;line-height:1.6;">${body}</div>
        ${cta ? `<a href="${cta.href}" style="display:inline-block;margin-top:20px;background:${GOLD};color:${NAVY};text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;">${esc(cta.label)}</a>` : ''}
      </div>
      <div style="background:#F6F7FB;padding:16px 28px;border-top:1px solid #DDE3F0;">
        <p style="margin:0;font-size:11px;color:#8892B0;">${esc(footer)}</p>
      </div>
    </div>
  </div>`;
}

async function safeSend(opts) {
  try {
    if (!opts.to || (Array.isArray(opts.to) && opts.to.length === 0)) return { sent: false };
    return await sendMail({ ...opts, to: Array.isArray(opts.to) ? opts.to.join(',') : opts.to });
  } catch (err) {
    console.error('[jobMail]', opts.subject, '-', err.message);
    return { sent: false, error: err.message };
  }
}

/* ── To the Secretariat ── */

function notifyModeratorsEmployer(settings, employer) {
  return safeSend({
    to: settings.moderatorEmails,
    subject: `Employer awaiting approval: ${employer.companyName}`,
    html: frame({
      kicker: 'Job board moderation',
      heading: `${employer.companyName} has registered as an employer`,
      body: `<p>${esc(employer.contactName)} (${esc(employer.email)}) registered an employer account and is waiting for approval before they can post.</p>
             <p>Target approval time: ${esc(settings.approvalTargetHours)} hours.</p>`,
      cta: { href: link('/admin/jobs?tab=employers'), label: 'Review employer' },
    }),
  });
}

function notifyModeratorsListing(settings, job, employer) {
  return safeSend({
    to: settings.moderatorEmails,
    subject: `Listing awaiting approval: ${job.title}`,
    html: frame({
      kicker: 'Job board moderation',
      heading: `New listing from ${employer?.companyName || job.company}`,
      body: `<p><strong>${esc(job.title)}</strong>, ${esc(job.location)}</p>
             <p>Target approval time: ${esc(settings.approvalTargetHours)} hours.</p>`,
      cta: { href: link('/admin/jobs?tab=queue'), label: 'Open moderation queue' },
    }),
  });
}

/* ── To employers ── */

function employerStatusEmail(employer) {
  const approved = employer.status === 'approved';
  return safeSend({
    to: employer.email,
    subject: approved ? 'Your NIQS employer account is approved' : 'Update on your NIQS employer account',
    html: frame({
      kicker: 'Employer account',
      greeting: `Hi ${employer.contactName},`,
      heading: approved
        ? `${employer.companyName} can now post on the NIQS job board`
        : `Your employer account is ${employer.status}`,
      body: `${approved
        ? '<p>Each listing you post is checked by the Secretariat before it goes live.</p>'
        : ''}${employer.statusNote ? `<p><strong>Note from the Secretariat:</strong> ${esc(employer.statusNote)}</p>` : ''}`,
      cta: { href: link('/employer'), label: 'Open employer dashboard' },
    }),
  });
}

function listingStatusEmail(job, employer) {
  if (!employer?.email) return Promise.resolve({ sent: false });
  const live = job.status === 'published';
  return safeSend({
    to: employer.email,
    subject: live ? `Your listing is live: ${job.title}` : `Update on your listing: ${job.title}`,
    html: frame({
      kicker: 'Listing update',
      greeting: `Hi ${employer.contactName},`,
      heading: live ? `"${job.title}" is now on the NIQS job board` : `"${job.title}" is ${job.status}`,
      body: job.moderationNote ? `<p><strong>Note from the Secretariat:</strong> ${esc(job.moderationNote)}</p>` : '',
      cta: { href: live ? link(`/jobs/${job._id}`) : link('/employer/listings'), label: live ? 'View listing' : 'Open your listings' },
    }),
  });
}

function newApplicationEmail(job, employer, application) {
  if (!employer?.email) return Promise.resolve({ sent: false });
  const v = application.verification || {};
  const badge = v.verified
    ? `Verified on the NIQS register: ${esc(v.gradeLabel || v.grade)}${v.goodStanding === true ? ', in good standing' : ''}`
    : 'Not verified against the NIQS register';
  return safeSend({
    to: employer.email,
    subject: `New application: ${job.title}`,
    html: frame({
      kicker: 'Applicant inbox',
      greeting: `Hi ${employer.contactName},`,
      heading: `${application.fullName} applied for ${job.title}`,
      body: `<p>${badge}.</p>`,
      cta: { href: link(`/employer/applicants?job=${job._id}`), label: 'Open applicant inbox' },
    }),
  });
}

/* ── To members ── */

const STATUS_COPY = {
  viewed:       'The employer has opened your application.',
  shortlisted:  'You have been shortlisted.',
  interview:    'The employer would like to interview you. Expect them to contact you directly.',
  offered:      'The employer has made you an offer.',
  hired:        'Congratulations, the employer has marked you as hired.',
  not_selected: 'The employer has decided not to take your application further this time.',
};

function applicationStatusEmail(application, job) {
  const line = STATUS_COPY[application.status];
  if (!line) return Promise.resolve({ sent: false });
  return safeSend({
    to: application.email,
    subject: `Application update: ${job.title}`,
    html: frame({
      kicker: 'Application tracker',
      greeting: `Hi ${application.fullName},`,
      heading: `${job.title} at ${job.company}`,
      body: `<p>${line}</p>`,
      cta: { href: link('/portal/jobs'), label: 'Track your applications' },
    }),
  });
}

function jobAlertEmail(user, alert, jobs) {
  const rows = jobs.map((j) => `
    <tr><td style="padding:10px 0;border-bottom:1px solid #eef0f6;">
      <a href="${link(`/jobs/${j._id}`)}" style="color:${NAVY};font-weight:700;text-decoration:none;">${esc(j.title)}</a><br>
      <span style="font-size:12px;color:#8892B0;">${esc(j.company)} · ${esc(j.location)}${j.deadline ? ` · closes ${esc(fmtDate(j.deadline))}` : ''}</span>
    </td></tr>`).join('');
  return safeSend({
    to: user.email,
    subject: jobs.length === 1 ? `New role: ${jobs[0].title}` : `${jobs.length} new roles on the NIQS job board`,
    html: frame({
      kicker: 'Job alert',
      greeting: `Hi ${user.firstName},`,
      heading: alert.name ? `New roles for "${alert.name}"` : 'New roles that match your alert',
      body: `<table style="width:100%;border-collapse:collapse;">${rows}</table>`,
      cta: { href: link('/jobs'), label: 'Browse the job board' },
      footer: 'You set up this alert on niqs.org.ng. Manage or switch it off under Member Portal → Job Alerts.',
    }),
  });
}

function employerResetEmail(employer, resetLink) {
  return safeSend({
    to: employer.email,
    subject: 'Reset your NIQS employer password',
    html: frame({
      kicker: 'Employer account',
      greeting: `Hi ${employer.contactName},`,
      heading: 'Reset your employer password',
      body: `<p>This link expires in <strong>30 minutes</strong>. If you did not ask for it, ignore this email.</p>
             <p style="font-size:11px;color:#8892B0;word-break:break-all;">${esc(resetLink)}</p>`,
      cta: { href: resetLink, label: 'Reset password' },
    }),
  });
}

module.exports = {
  notifyModeratorsEmployer, notifyModeratorsListing,
  employerStatusEmail, listingStatusEmail, newApplicationEmail,
  applicationStatusEmail, jobAlertEmail, employerResetEmail,
};
