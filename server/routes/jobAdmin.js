const router = require('express').Router();
const a = require('../controllers/jobAdminController');
const { protect, adminOnly } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');

// The Secretariat: main and national admins. Board policy is main admin only.
router.use(protect, adminOnly, roleCheck('main_admin', 'national_admin'));

router.get('/employers', a.listEmployers);
router.post('/employers/:id/status', a.setEmployerStatus);
router.post('/employers/:id/flag', a.flagEmployer);
router.put('/employers/:id', a.updateEmployerLinks);
router.get('/reports', a.reports);
router.get('/reports.csv', a.reportsCsv);
router.get('/settings', a.getSettings);
router.put('/settings', roleCheck('main_admin'), a.updateSettings);

module.exports = router;
