const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Seat = require('../models/Seat');
const Ticket = require('../models/Ticket');
const { generateQrImage, signQrToken } = require('../services/qr');

exports.createBooking = async (req, res) => {
  const { eventId, seatIds } = req.body;
  const userId = req.user.id;

  if (!mongoose.isValidObjectId(eventId) || !Array.isArray(seatIds) || seatIds.length === 0
    || seatIds.some((id) => !mongoose.isValidObjectId(id))) {
    return res.status(400).json({ error: 'A valid event and one or more seat IDs are required' });
  }
  const uniqueSeatIds = [...new Set(seatIds.map((id) => id.toString()))];
  if (uniqueSeatIds.length !== seatIds.length) {
    return res.status(400).json({ error: 'Seat IDs must be unique' });
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const seats = await Seat.find({
      _id: { $in: uniqueSeatIds },
      event: eventId,
      status: 'held',
      heldBy: userId,
      holdExpiresAt: { $gt: new Date() }
    }).session(session);

    if (seats.length !== uniqueSeatIds.length) {
      throw new Error('One or more seats are no longer held by you (hold may have expired)');
    }

    const amount = seats.reduce((sum, seat) => sum + seat.price, 0);
    await Seat.updateMany(
      { _id: { $in: uniqueSeatIds }, event: eventId, status: 'held', heldBy: userId },
      { status: 'booked', heldBy: null, holdExpiresAt: null },
      { session }
    );

    const [booking] = await Booking.create([{
      attendee: userId,
      event: eventId,
      seats: uniqueSeatIds,
      amount,
      paymentRef: `MOCK-${Date.now()}`
    }], { session });

    const tickets = [];
    for (const seat of seats) {
      const [ticket] = await Ticket.create([{
        booking: booking._id,
        seat: seat._id,
        qrToken: signQrToken(booking._id, seat._id)
      }], { session });
      tickets.push(ticket);
    }

    await session.commitTransaction();
    req.io.to(`event:${eventId}`).emit('seats-booked', { seatIds: uniqueSeatIds });

    const ticketsWithQr = await Promise.all(tickets.map(async (ticket) => {
      const ticketSeat = seats.find((seat) => seat._id.equals(ticket.seat));
      return {
        ...ticket.toObject(),
        seat: ticketSeat,
        qrImage: await generateQrImage(ticket.qrToken)
      };
    }));
    res.status(201).json({ booking, tickets: ticketsWithQr });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    res.status(409).json({ error: error.message || 'Booking could not be completed' });
  } finally {
    await session.endSession();
  }
};

exports.getMyBookings = async (req, res) => {
  const bookings = await Booking.find({ attendee: req.user.id })
    .populate('event')
    .populate('seats')
    .sort({ createdAt: -1 });
  res.json(bookings);
};

exports.getBookingTickets = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.bookingId)) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  const booking = await Booking.findOne({ _id: req.params.bookingId, attendee: req.user.id });
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const tickets = await Ticket.find({ booking: booking._id }).populate('seat');
  const withQr = await Promise.all(tickets.map(async (ticket) => ({
    ...ticket.toObject(),
    qrImage: await generateQrImage(ticket.qrToken)
  })));
  res.json(withQr);
};
