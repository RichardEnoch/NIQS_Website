const router = require('express').Router();
const ctrl = require('../controllers/libraryController');
const { protect, adminOnly, memberOnly, optionalAuth } = require('../middleware/auth');
const { roleCheck, deleteCheck } = require('../middleware/roleCheck');

const national = roleCheck('main_admin', 'national_admin');

// Public catalogue (shows more to signed-in members)
router.get('/',            optionalAuth, ctrl.list);
router.get('/facets',      optionalAuth, ctrl.facets);
router.get('/item/:slug',  optionalAuth, ctrl.getOne);
router.get('/:id/open',    optionalAuth, ctrl.open);

// Member shelf and progress
router.get('/me',           protect, memberOnly, ctrl.myShelf);
router.put('/:id/progress', protect, memberOnly, ctrl.updateProgress);

// Admin
router.get('/admin/all', protect, adminOnly, national, ctrl.getAllAdmin);
router.post('/',         protect, adminOnly, national, ctrl.create);
router.put('/:id',       protect, adminOnly, national, ctrl.update);
router.delete('/:id',    protect, adminOnly, deleteCheck, ctrl.remove);

module.exports = router;
