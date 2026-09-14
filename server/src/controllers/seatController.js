const mongoose = require('mongoose');
const Seat = require('../models/Seat');

exports.getSeatsForEvent = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.eventId)) {
    return res.status(404).json({ error: 'Event not found' });
  }
  const seats = await Seat.find({ event: req.params.eventId }).sort({ row: 1, label: 1 });
  res.json(seats);
};
