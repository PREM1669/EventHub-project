const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const controller = require('../controllers/eventController');
const seatController = require('../controllers/seatController');

router.get('/', controller.listEvents);
router.get('/mine', authenticate, requireRole('organizer'), controller.getMyEvents);
router.get('/:eventId/seats', seatController.getSeatsForEvent);
router.get('/:id', controller.getEventById);
router.post('/', authenticate, requireRole('organizer'), controller.createEvent);
router.put('/:id', authenticate, requireRole('organizer'), controller.updateEvent);
router.post('/:id/publish', authenticate, requireRole('organizer'), controller.publishEvent);
router.delete('/:id', authenticate, requireRole('organizer'), controller.deleteEvent);

module.exports = router;
