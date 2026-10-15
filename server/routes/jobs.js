const router = require('express').Router();
const jobs = require('../controllers/jobController');
const careers = require('../controllers/careerController');
const { protect, adminOnly, memberOnly, employerOnly, optionalAuth } = require('../middleware/auth');
const { roleCheck, deleteCheck } = require('../middleware/roleCheck');
const rateLimit = require('../middleware/rateLimit');

const NATIONAL = roleCheck('main_admin', 'national_admin');
const applyLimit = rateLimit({ windowMs: 60_000, max: 10 });

/* ── Public board ── */
router.get('/', optionalAuth, careers.attachSaved, jobs.getAllJobs);
router.get('/meta', jobs.getMeta);

/* ── Chapters (any admin; state admins are pinned to their own state) ── */
router.get('/chapter', protect, adminOnly, jobs.chapterJobs);

/* ── Employers' own listings ── */
router.get('/mine', protect, employerOnly, jobs.myListings);
router.post('/mine', protect, employerOnly, jobs.createMyListing);
router.put('/mine/:id', protect, employerOnly, jobs.updateMyListing);
router.post('/mine/:id/status', protect, employerOnly, jobs.setMyListingStatus);
router.post('/mine/:id/feature', protect, employerOnly, jobs.requestFeatured);
router.delete('/mine/:id', protect, employerOnly, jobs.deleteMyListing);

/* ── Admin: every listing, moderation, featured, fees ── */
router.get('/admin/all', protect, adminOnly, NATIONAL, jobs.adminList);
router.post('/', protect, adminOnly, NATIONAL, jobs.createJob);
router.put('/:id', protect, adminOnly, NATIONAL, jobs.updateJob);
router.post('/:id/moderate', protect, adminOnly, NATIONAL, jobs.moderate);
router.post('/:id/featured', protect, adminOnly, NATIONAL, jobs.setFeatured);
router.post('/:id/listing-fee', protect, adminOnly, NATIONAL, jobs.recordListingFee);
router.delete('/:id', protect, adminOnly, deleteCheck, jobs.deleteJob);

/* ── Members ── */
router.post('/:id/apply', protect, memberOnly, applyLimit, careers.apply);

/* Last, so it cannot swallow /meta, /mine or /chapter */
router.get('/:id', optionalAuth, careers.attachSaved, jobs.getJobById);

module.exports = router;
