/**
 * Shared vocabulary for the job board: grades, sectors, contract types and
 * tracks, and the one rule that compares them.
 *
 * The grade ladder is the NIQS membership ladder as the User model stores it.
 * A listing's `minGrade` is met by that grade or any above it. Technicians sit
 * outside the QS ladder, so they meet no minimum except "none".
 */
const GRADE_ORDER = ['student', 'probationer', 'graduate', 'corporate', 'fellow'];

const GRADE_LABELS = {
  none:        'Open to all',
  student:     'Student',
  probationer: 'Probationer',
  graduate:    'Graduate member',
  corporate:   'Corporate member (MNIQS)',
  fellow:      'Fellow (FNIQS)',
  technician:  'Technician',
};

const MIN_GRADES = ['none', 'student', 'probationer', 'graduate', 'corporate', 'fellow'];

const SECTOR_LABELS = {
  consultancy:    'Consultancy',
  contracting:    'Contracting',
  public_service: 'Public service',
  academia:       'Academia',
  developer:      'Developer / client side',
  other:          'Other',
};

const JOB_TYPES = ['full-time', 'part-time', 'contract', 'remote', 'internship'];

/* 'job' is the main board. 'internship' and 'siwes' are the graduate track:
   placements for students and probationers working toward TPC / GDE. */
const TRACKS = ['job', 'internship', 'siwes'];

const JOB_STATUSES = ['draft', 'pending', 'published', 'paused', 'rejected', 'closed', 'filled'];

const APPLICATION_STATUSES = ['submitted', 'viewed', 'shortlisted', 'interview', 'offered', 'hired', 'not_selected', 'withdrawn'];

/** Does a member of `grade` meet a listing's `minGrade`? */
function meetsGrade(grade, minGrade) {
  if (!minGrade || minGrade === 'none') return true;
  const have = GRADE_ORDER.indexOf(grade);
  const need = GRADE_ORDER.indexOf(minGrade);
  if (need === -1) return true;
  return have !== -1 && have >= need;
}

/** Grades that satisfy a minimum, for building Mongo queries. */
function gradesAtOrAbove(minGrade) {
  const i = GRADE_ORDER.indexOf(minGrade);
  return i === -1 ? GRADE_ORDER.slice() : GRADE_ORDER.slice(i);
}

/** Grades whose holders could apply: listings with minGrade in this set. */
function minGradesMetBy(grade) {
  const i = GRADE_ORDER.indexOf(grade);
  if (i === -1) return ['none'];
  return ['none', ...GRADE_ORDER.slice(0, i + 1)];
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  GRADE_ORDER, GRADE_LABELS, MIN_GRADES, SECTOR_LABELS, JOB_TYPES, TRACKS,
  JOB_STATUSES, APPLICATION_STATUSES,
  meetsGrade, gradesAtOrAbove, minGradesMetBy, escapeRegex,
};
