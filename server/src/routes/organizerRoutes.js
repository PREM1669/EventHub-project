const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const controller = require('../controllers/organizerController');

router.use(authenticate, requireRole('organizer'));
router.get('/:eventId/roster', controller.getRoster);
router.get('/:eventId/roster/export', controller.exportRosterCsv);
router.get('/:eventId/analytics', controller.getAnalytics);
router.post('/:eventId/announcements', controller.sendAnnouncement);
router.get('/:eventId/announcements', controller.getAnnouncements);

module.exports = router;
