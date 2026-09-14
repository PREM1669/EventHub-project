const mongoose = require('mongoose');
const Event = require('../models/Event');
const { generateSeats } = require('../services/seatGenerator');

function validateEventInput({ title, venue, date, capacity, priceTiers }) {
  if (!title || !venue || !date || !Number.isInteger(Number(capacity)) || Number(capacity) < 1) {
    return 'Title, venue, date, and a positive integer capacity are required';
  }
  if (!Array.isArray(priceTiers) || priceTiers.length === 0) return 'At least one price tier is required';
  if (priceTiers.some((tier) => !tier.name || Number(tier.price) < 0 || !Number.isInteger(Number(tier.seatCount)) || Number(tier.seatCount) < 1)) {
    return 'Each price tier needs a name, non-negative price, and positive integer seat count';
  }
  const tierSeats = priceTiers.reduce((sum, tier) => sum + Number(tier.seatCount), 0);
  if (tierSeats !== Number(capacity)) return 'Price tier seat counts must sum to capacity';
  if (Number.isNaN(new Date(date).getTime())) return 'A valid event date is required';
  return null;
}

exports.createEvent = async (req, res) => {
  const error = validateEventInput(req.body);
  if (error) return res.status(400).json({ error });

  const event = await Event.create({
    organizer: req.user.id,
    title: req.body.title,
    description: req.body.description || '',
    category: req.body.category || 'General',
    venue: req.body.venue,
    date: req.body.date,
    capacity: Number(req.body.capacity),
    priceTiers: req.body.priceTiers.map((tier) => ({
      name: tier.name,
      price: Number(tier.price),
      seatCount: Number(tier.seatCount)
    }))
  });
  res.status(201).json(event);
};

exports.updateEvent = async (req, res) => {
  const event = await Event.findOne({ _id: req.params.id, organizer: req.user.id });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const next = { ...event.toObject(), ...req.body };
  const error = validateEventInput(next);
  if (error) return res.status(400).json({ error });

  Object.assign(event, {
    title: req.body.title,
    description: req.body.description || '',
    category: req.body.category || 'General',
    venue: req.body.venue,
    date: req.body.date,
    capacity: Number(req.body.capacity),
    priceTiers: req.body.priceTiers.map((tier) => ({
      name: tier.name,
      price: Number(tier.price),
      seatCount: Number(tier.seatCount)
    })),
    status: req.body.status || event.status
  });
  await event.save();
  res.json(event);
};

exports.publishEvent = async (req, res) => {
  const event = await Event.findOne({ _id: req.params.id, organizer: req.user.id });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.status === 'published') return res.status(400).json({ error: 'Already published' });

  event.status = 'published';
  await event.save();
  await generateSeats(event);
  res.json(event);
};

exports.deleteEvent = async (req, res) => {
  const deleted = await Event.findOneAndDelete({ _id: req.params.id, organizer: req.user.id });
  if (!deleted) return res.status(404).json({ error: 'Event not found' });
  res.json({ success: true });
};

exports.getMyEvents = async (req, res) => {
  const events = await Event.find({ organizer: req.user.id }).sort({ date: 1 });
  res.json(events);
};

exports.getEventById = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Event not found' });
  const event = await Event.findOne({ _id: req.params.id, status: 'published' });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
};

exports.listEvents = async (req, res) => {
  const { search, category, from, to } = req.query;
  const filter = { status: 'published' };

  if (search) filter.$text = { $search: search };
  if (category) filter.category = category;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const events = await Event.find(filter).sort({ date: 1 });
  res.json(events);
};
