const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { verifyQrToken } = require('../services/qr');

async function checkIn(req, res) {
  const { qrToken } = req.body;
  if (typeof qrToken !== 'string' || !qrToken.trim()) {
    return res.status(400).json({ error: 'QR token is required' });
  }

  let payload;
  try {
    payload = verifyQrToken(qrToken.trim());
  } catch {
    return res.status(400).json({ error: 'Invalid or tampered QR code' });
  }

  if (!mongoose.isValidObjectId(payload.bookingId) || !mongoose.isValidObjectId(payload.seatId)) {
    return res.status(400).json({ error: 'Invalid QR code payload' });
  }

  const ticket = await Ticket.findOne({ booking: payload.bookingId, seat: payload.seatId })
    .populate({
      path: 'booking',
      populate: [
        { path: 'event', model: Event },
        { path: 'attendee', select: 'name email' }
      ]
    })
    .populate('seat', 'label tier price');

  if (!ticket || !ticket.booking?.event || !ticket.seat) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  if (String(ticket.booking.event.organizer) !== req.user.id) {
    return res.status(403).json({ error: 'Not your event' });
  }

  if (ticket.booking.status !== 'confirmed') {
    return res.status(409).json({ error: 'Booking is cancelled — cannot check in' });
  }

  if (ticket.checkedIn) {
    return res.status(409).json({
      error: 'Ticket already checked in',
      checkedInAt: ticket.checkedInAt
    });
  }

  const checkedInAt = new Date();
  const update = await Ticket.updateOne(
    { _id: ticket._id, checkedIn: false },
    { $set: { checkedIn: true, checkedInAt } }
  );

  if (update.modifiedCount !== 1) {
    const currentTicket = await Ticket.findById(ticket._id).select('checkedIn checkedInAt');
    if (currentTicket?.checkedIn) {
      return res.status(409).json({
        error: 'Ticket already checked in',
        checkedInAt: currentTicket.checkedInAt
      });
    }
    return res.status(409).json({ error: 'Ticket could not be checked in. Please try again.' });
  }

  const bookingIds = await Booking.find({
    event: ticket.booking.event._id,
    status: 'confirmed'
  }).distinct('_id');
  const checkedInCount = await Ticket.countDocuments({
    booking: { $in: bookingIds },
    checkedIn: true
  });

  req.io?.to(`event:${ticket.booking.event._id}`).emit('checkin-update', { checkedInCount });
  res.json({
    success: true,
    attendeeName: ticket.booking.attendee?.name || 'Unknown attendee',
    seatLabel: ticket.seat.label,
    tier: ticket.seat.tier,
    checkedInCount,
    checkedInAt
  });
}

exports.checkInByToken = checkIn;
exports.checkInManual = checkIn;
