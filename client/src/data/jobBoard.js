/**
 * Job board labels, mirroring server/utils/jobBoard.js. The server is the
 * authority (GET /api/jobs/meta returns the same lists); these exist so a
 * page can label things without waiting on a request.
 */
export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
  'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
  'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];
export const LISTING_STATES = [...NIGERIAN_STATES, 'Outside Nigeria'];

export const SECTORS = [
  { value: 'consultancy', label: 'Consultancy' },
  { value: 'contracting', label: 'Contracting' },
  { value: 'public_service', label: 'Public service' },
  { value: 'academia', label: 'Academia' },
  { value: 'developer', label: 'Developer / client side' },
  { value: 'other', label: 'Other' },
];
export const sectorLabel = (v) => SECTORS.find((s) => s.value === v)?.label || v || '';

/* Minimum grade on a listing. Order matters: each meets everything before it. */
export const GRADES = [
  { value: 'none', label: 'Open to all' },
  { value: 'student', label: 'Student' },
  { value: 'probationer', label: 'Probationer' },
  { value: 'graduate', label: 'Graduate member' },
  { value: 'corporate', label: 'Corporate member (MNIQS)' },
  { value: 'fellow', label: 'Fellow (FNIQS)' },
];
export const gradeLabel = (v) => GRADES.find((g) => g.value === v)?.label || (v === 'technician' ? 'Technician' : v || '');

export const JOB_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'remote', label: 'Remote' },
  { value: 'internship', label: 'Internship' },
];
export const typeLabel = (v) => JOB_TYPES.find((t) => t.value === v)?.label || v || '';

export const TRACKS = [
  { value: 'job', label: 'Jobs' },
  { value: 'internship', label: 'Internships' },
  { value: 'siwes', label: 'SIWES placements' },
];

/* Listing status, as employers and the Secretariat see it */
export const LISTING_STATUS = {
  draft:     { label: 'Draft',            tone: 'grey' },
  pending:   { label: 'Awaiting approval', tone: 'amber' },
  published: { label: 'Live',             tone: 'green' },
  paused:    { label: 'Paused',           tone: 'grey' },
  rejected:  { label: 'Changes needed',   tone: 'red' },
  closed:    { label: 'Closed',           tone: 'grey' },
  filled:    { label: 'Filled',           tone: 'blue' },
};

/* Application status, as both sides see it */
export const APPLICATION_STATUS = {
  submitted:    { label: 'Sent',          tone: 'grey' },
  viewed:       { label: 'Viewed',        tone: 'blue' },
  shortlisted:  { label: 'Shortlisted',   tone: 'amber' },
  interview:    { label: 'Interview',     tone: 'amber' },
  offered:      { label: 'Offer made',    tone: 'green' },
  hired:        { label: 'Hired',         tone: 'green' },
  not_selected: { label: 'Not selected',  tone: 'red' },
  withdrawn:    { label: 'Withdrawn',     tone: 'grey' },
};
/* Statuses an employer can move an application to */
export const EMPLOYER_STATUS_ACTIONS = ['viewed', 'shortlisted', 'interview', 'offered', 'hired', 'not_selected'];

export const TONES = {
  grey:  { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' },
  amber: { bg: '#fff7ed', color: '#b45309', border: '#fed7aa' },
  green: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  red:   { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  blue:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  navy:  { bg: '#000066', color: '#ffffff', border: '#000066' },
  gold:  { bg: '#fdf8ea', color: '#8a6d1a', border: '#ecd9a0' },
};

export const naira = (n) => (n || n === 0)
  ? `₦${Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
  : '';

/** "₦300,000 – ₦400,000 / month", or the employer's free-text salary. */
export function salaryText(job) {
  if (job.salary) return job.salary;
  if (job.salaryMin && job.salaryMax) return `${naira(job.salaryMin)} – ${naira(job.salaryMax)} / month`;
  if (job.salaryMin) return `From ${naira(job.salaryMin)} / month`;
  if (job.salaryMax) return `Up to ${naira(job.salaryMax)} / month`;
  return '';
}

export function fmtDate(d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return d ? new Date(d).toLocaleDateString('en-NG', opts) : '';
}

export function daysLeft(deadline) {
  return deadline ? Math.ceil((new Date(deadline) - new Date()) / 86_400_000) : null;
}

/** What the verification snapshot means, in words for an employer or member. */
export function verificationText(v = {}) {
  if (v.verified) {
    return {
      tone: 'green',
      title: `Verified: ${v.gradeLabel || gradeLabel(v.grade)}`,
      detail: v.goodStanding === true ? 'Checked against the NIQS register; in good standing.'
        : v.goodStanding === false ? 'Checked against the NIQS register; not currently in good standing.'
        : 'Checked against the NIQS register.',
    };
  }
  if (v.source === 'website') {
    return {
      tone: 'amber',
      title: `Recorded grade: ${v.gradeLabel || gradeLabel(v.grade) || 'not stated'}`,
      detail: 'From the member\'s niqs.org.ng account. Not yet checked against the NIQS register.',
    };
  }
  if (v.grade) {
    return {
      tone: 'grey',
      title: `Stated grade: ${v.gradeLabel || gradeLabel(v.grade)}`,
      detail: 'No membership number is on file for this account, so the grade has not been checked.',
    };
  }
  return { tone: 'grey', title: 'Not verified', detail: 'No NIQS membership record was found for this applicant.' };
}
