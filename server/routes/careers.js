/**
 * Members' and employers' career tools. See controllers/careerController.js.
 */
const router = require('express').Router();
const multer = require('multer');
const c = require('../controllers/careerController');
const { protect, adminOnly, memberOnly, employerOnly, employerApproved } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');
const rateLimit = require('../middleware/rateLimit');

// CVs are held in memory only long enough to validate and store in Mongo.
const cvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });
const uploadLimit = rateLimit({ windowMs: 60_000, max: 10 });
const inviteLimit = rateLimit({ windowMs: 60 * 60_000, max: 30, key: (req) => `inv:${req.employer?._id || req.ip}` });

function cvField(req, res, next) {
  cvUpload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'CV files must be 2 MB or smaller' : 'Upload failed' });
    next();
  });
}

/* ── Member ── */
router.get('/verification', protect, memberOnly, c.myVerification);
router.get('/cv', protect, memberOnly, c.myCvs);
router.post('/cv', protect, memberOnly, uploadLimit, cvField, c.uploadCv);
router.delete('/cv/:id', protect, memberOnly, c.deleteCv);
router.get('/applications', protect, memberOnly, c.myApplications);
router.post('/applications/:id/withdraw', protect, memberOnly, c.withdraw);
router.get('/saved', protect, memberOnly, c.savedJobs);
router.post('/saved/:jobId', protect, memberOnly, c.saveJob);
router.delete('/saved/:jobId', protect, memberOnly, c.unsaveJob);
router.get('/alerts', protect, memberOnly, c.listAlerts);
router.post('/alerts', protect, memberOnly, c.createAlert);
router.put('/alerts/:id', protect, memberOnly, c.updateAlert);
router.delete('/alerts/:id', protect, memberOnly, c.deleteAlert);
router.get('/profile', protect, memberOnly, c.getProfile);
router.put('/profile', protect, memberOnly, c.updateProfile);

/* ── Files: owner, the employer applied to, talent search, or admin ── */
router.get('/files/:id', protect, c.downloadFile);

/* ── Employer ── */
router.get('/inbox', protect, employerOnly, c.inbox);
router.get('/inbox/:id', protect, employerOnly, c.inboxItem);
router.put('/inbox/:id', protect, employerOnly, c.updateInboxItem);
router.get('/talent', protect, (req, res, next) => (req.admin ? next() : employerApproved(req, res, next)), c.talent);
router.post('/talent/:id/invite', protect, employerApproved, inviteLimit, c.inviteTalent);

/* ── Admin ── */
router.get('/admin/applications', protect, adminOnly, roleCheck('main_admin', 'national_admin'), c.adminApplications);

module.exports = router;
