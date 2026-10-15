const router = require('express').Router();
const e = require('../controllers/employerController');
const { protect, employerOnly } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

const authLimit = rateLimit({ windowMs: 15 * 60_000, max: 20 });

router.get('/info', e.publicInfo);
router.post('/register', authLimit, e.register);
router.post('/login', authLimit, e.login);
router.post('/forgot-password', authLimit, e.forgotPassword);
router.put('/reset-password/:token', authLimit, e.resetPassword);

router.get('/me', protect, employerOnly, e.me);
router.put('/me', protect, employerOnly, e.updateMe);
router.put('/me/password', protect, employerOnly, e.changePassword);
router.get('/me/summary', protect, employerOnly, e.summary);

module.exports = router;
