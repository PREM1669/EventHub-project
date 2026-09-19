const mongoose = require('mongoose');
const Event = require('../models/Event');
const Seat = require('../models/Seat');
const { generateSeats } = require('../services/seatGenerator');

exports.getSeatsForEvent = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.eventId)) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const event = await Event.findOne({ _id: req.params.eventId, status: 'published' });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  let seats = await Seat.find({ event: event._id }).sort({ row: 1, label: 1 });
  if (seats.length === 0) {
    await generateSeats(event);
    seats = await Seat.find({ event: event._id }).sort({ row: 1, label: 1 });
  }
  res.json(seats);
};
