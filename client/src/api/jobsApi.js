/**
 * Job board API calls, in one place. Every function returns the response
 * body (axios `data`). Server contract: docs/JOB_PORTAL.md.
 */
import API from './axios';

const d = (p) => p.then((r) => r.data);
const qs = (params = {}) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length))
      .map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : String(v)]),
  ).toString();
  return s ? `?${s}` : '';
};

/* ── Public board ── */
export const listJobs = (params) => d(API.get(`/jobs${qs(params)}`));          // { jobs, total, page, pages }
export const getJobMeta = () => d(API.get('/jobs/meta'));                       // { states, sectors, grades, types, tracks, countsByState, countsByTrack, nonMembersCanApply }
export const getJob = (id) => d(API.get(`/jobs/${id}`));                        // public view (+ myApplication for members)
export const getEmployerInfo = () => d(API.get('/employers/info'));             // prices, packages, approval time

/* ── Members ── */
export const applyToJob = (id, body) => d(API.post(`/jobs/${id}/apply`, body)); // { coverNote, cv, phone, shareProfile }
export const getMyVerification = () => d(API.get('/careers/verification'));
export const listMyCvs = () => d(API.get('/careers/cv'));
export const uploadCv = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return d(API.post('/careers/cv', fd));
};
export const deleteCv = (id) => d(API.delete(`/careers/cv/${id}`));
export const myApplications = () => d(API.get('/careers/applications'));
export const withdrawApplication = (id) => d(API.post(`/careers/applications/${id}/withdraw`));
export const savedJobs = () => d(API.get('/careers/saved'));
export const saveJob = (id) => d(API.post(`/careers/saved/${id}`));
export const unsaveJob = (id) => d(API.delete(`/careers/saved/${id}`));
export const listAlerts = () => d(API.get('/careers/alerts'));
export const createAlert = (body) => d(API.post('/careers/alerts', body));
export const updateAlert = (id, body) => d(API.put(`/careers/alerts/${id}`, body));
export const deleteAlert = (id) => d(API.delete(`/careers/alerts/${id}`));
export const getCareerProfile = () => d(API.get('/careers/profile'));
export const updateCareerProfile = (body) => d(API.put('/careers/profile', body));

/**
 * CVs are behind an access check, so a plain <a href> would arrive without
 * the bearer token. Fetch as a blob and hand it to the browser instead.
 */
export async function downloadCvFile(id, filename = 'cv') {
  const res = await API.get(`/careers/files/${id}`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/* ── Employers ── */
export const employerMe = () => d(API.get('/employers/me'));
export const updateEmployerMe = (body) => d(API.put('/employers/me', body));
export const changeEmployerPassword = (body) => d(API.put('/employers/me/password', body));
export const employerSummary = () => d(API.get('/employers/me/summary'));
export const employerForgotPassword = (email) => d(API.post('/employers/forgot-password', { email }));
export const employerResetPassword = (token, password) => d(API.put(`/employers/reset-password/${token}`, { password }));
export const myListings = () => d(API.get('/jobs/mine'));
export const createListing = (body) => d(API.post('/jobs/mine', body));           // body.submit = true sends to moderation
export const updateListing = (id, body) => d(API.put(`/jobs/mine/${id}`, body));
export const setListingStatus = (id, action, extra = {}) => d(API.post(`/jobs/mine/${id}/status`, { action, ...extra })); // submit|pause|resume|close|fill
export const requestFeatured = (id) => d(API.post(`/jobs/mine/${id}/feature`));
export const deleteListing = (id) => d(API.delete(`/jobs/mine/${id}`));
export const inbox = (params) => d(API.get(`/careers/inbox${qs(params)}`));
export const inboxItem = (id) => d(API.get(`/careers/inbox/${id}`));
export const updateInboxItem = (id, body) => d(API.put(`/careers/inbox/${id}`, body)); // { status, note, employerNote }
export const searchTalent = (params) => d(API.get(`/careers/talent${qs(params)}`));
export const inviteTalent = (profileId, body) => d(API.post(`/careers/talent/${profileId}/invite`, body)); // { job, message }

/* ── Admin (Secretariat) ── */
export const adminListJobs = (params) => d(API.get(`/jobs/admin/all${qs(params)}`));
export const adminCreateJob = (body) => d(API.post('/jobs', body));
export const adminUpdateJob = (id, body) => d(API.put(`/jobs/${id}`, body));
export const adminDeleteJob = (id) => d(API.delete(`/jobs/${id}`));
export const moderateJob = (id, action, note) => d(API.post(`/jobs/${id}/moderate`, { action, note })); // approve|reject|pause|restore|remove
export const setJobFeatured = (id, body) => d(API.post(`/jobs/${id}/featured`, body));  // { active, days, amount, reference, inNewsletter }
export const recordListingFee = (id, body) => d(API.post(`/jobs/${id}/listing-fee`, body));
export const adminApplications = (params) => d(API.get(`/careers/admin/applications${qs(params)}`));
export const adminEmployers = (params) => d(API.get(`/job-admin/employers${qs(params)}`));
export const setEmployerStatus = (id, status, note) => d(API.post(`/job-admin/employers/${id}/status`, { status, note }));
export const flagEmployer = (id, flagged, note) => d(API.post(`/job-admin/employers/${id}/flag`, { flagged, note }));
export const updateEmployerLinks = (id, body) => d(API.put(`/job-admin/employers/${id}`, body)); // { qsFirm, isPartner, package }
export const jobReports = (params) => d(API.get(`/job-admin/reports${qs(params)}`));
export const jobReportsCsv = async (params) => {
  const res = await API.get(`/job-admin/reports.csv${qs(params)}`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'niqs-job-board-report.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};
export const getBoardSettings = () => d(API.get('/job-admin/settings'));
export const updateBoardSettings = (body) => d(API.put('/job-admin/settings', body));
export const chapterJobs = (state) => d(API.get(`/jobs/chapter${qs({ state })}`));
