const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/organizer', authenticate, requireRole('organizer'), (req, res) => {
  res.json({ message: 'Organizer portal authorized', userId: req.user.id });
});

router.get('/attendee', authenticate, requireRole('attendee'), (req, res) => {
  res.json({ message: 'Attendee portal authorized', userId: req.user.id });
});

module.exports = router;
