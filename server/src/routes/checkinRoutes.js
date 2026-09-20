const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { checkInByToken } = require('../controllers/checkinController');

router.post('/', authenticate, requireRole('organizer'), checkInByToken);

module.exports = router;
