const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const controller = require('../controllers/bookingController');

router.post('/', authenticate, requireRole('attendee'), controller.createBooking);
router.get('/mine', authenticate, requireRole('attendee'), controller.getMyBookings);
router.post('/:bookingId/cancel', authenticate, requireRole('attendee'), controller.cancelBooking);
router.get('/:bookingId/tickets', authenticate, requireRole('attendee'), controller.getBookingTickets);

module.exports = router;
