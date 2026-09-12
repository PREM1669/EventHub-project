const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const controller = require('../controllers/eventController');

router.get('/', controller.listEvents);
router.get('/mine', authenticate, requireRole('organizer'), controller.getMyEvents);
router.get('/:id', controller.getEventById);
router.post('/', authenticate, requireRole('organizer'), controller.createEvent);
router.put('/:id', authenticate, requireRole('organizer'), controller.updateEvent);
router.delete('/:id', authenticate, requireRole('organizer'), controller.deleteEvent);

module.exports = router;
