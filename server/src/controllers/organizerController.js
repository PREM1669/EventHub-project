const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');

async function findOwnedEvent(eventId, organizerId) {
  if (!mongoose.isValidObjectId(eventId)) return null;
  return Event.findOne({ _id: eventId, organizer: organizerId });
}

async function getConfirmedBookings(eventId) {
  return Booking.find({ event: eventId, status: 'confirmed' })
    .populate('attendee', 'name email')
    .populate('seats', 'label tier price')
    .sort({ createdAt: -1 });
}

function rosterRows(bookings) {
  return bookings.flatMap((booking) => booking.seats.map((seat) => ({
    bookingId: booking._id,
    attendeeName: booking.attendee?.name || 'Unknown attendee',
    attendeeEmail: booking.attendee?.email || '',
    seatLabel: seat.label,
    tier: seat.tier,
    price: seat.price,
    bookedAt: booking.createdAt
  })));
}

exports.getRoster = async (req, res) => {
  const event = await findOwnedEvent(req.params.eventId, req.user.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(rosterRows(await getConfirmedBookings(event._id)));
};

function escapeCsv(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

exports.exportRosterCsv = async (req, res) => {
  const event = await findOwnedEvent(req.params.eventId, req.user.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const rows = rosterRows(await getConfirmedBookings(event._id));
  const csv = [
    ['Name', 'Email', 'Seat', 'Tier', 'Price', 'Booked At'],
    ...rows.map((row) => [row.attendeeName, row.attendeeEmail, row.seatLabel, row.tier, row.price, new Date(row.bookedAt).toISOString()])
  ].map((row) => row.map(escapeCsv).join(',')).join('\n');

  const filename = `${event.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'event'}-roster.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
};

exports.getAnalytics = async (req, res) => {
  const event = await findOwnedEvent(req.params.eventId, req.user.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const [stats] = await Booking.aggregate([
    { $match: { event: event._id, status: 'confirmed' } },
    { $group: { _id: null, revenue: { $sum: '$amount' }, ticketsSold: { $sum: { $size: '$seats' } } } }
  ]);
  const tierBreakdown = await Booking.aggregate([
    { $match: { event: event._id, status: 'confirmed' } },
    { $lookup: { from: 'seats', localField: 'seats', foreignField: '_id', as: 'seatDocs' } },
    { $unwind: '$seatDocs' },
    { $group: { _id: '$seatDocs.tier', count: { $sum: 1 }, revenue: { $sum: '$seatDocs.price' } } },
    { $sort: { revenue: -1 } }
  ]);

  const ticketsSold = stats?.ticketsSold || 0;
  const confirmedBookingIds = await Booking.find({ event: event._id, status: 'confirmed' }).distinct('_id');
  const checkedInCount = await Ticket.countDocuments({ booking: { $in: confirmedBookingIds }, checkedIn: true });
  res.json({
    revenue: stats?.revenue || 0,
    ticketsSold,
    capacity: event.capacity,
    soldPercent: event.capacity ? (ticketsSold / event.capacity) * 100 : 0,
    checkedInCount,
    tierBreakdown
  });
};

exports.sendAnnouncement = async (req, res) => {
  const event = await findOwnedEvent(req.params.eventId, req.user.id);
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (!message) return res.status(400).json({ error: 'Announcement message is required' });

  const announcement = await Announcement.create({
    event: event._id,
    organizer: req.user.id,
    message
  });
  req.io.to(`event:${event._id}`).emit('announcement', {
    message: announcement.message,
    sentAt: announcement.createdAt
  });
  res.status(201).json(announcement);
};

exports.getAnnouncements = async (req, res) => {
  const event = await findOwnedEvent(req.params.eventId, req.user.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(await Announcement.find({ event: event._id }).sort({ createdAt: -1 }));
};
