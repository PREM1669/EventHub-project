const mongoose = require('mongoose');
const Seat = require('../models/Seat');

const HOLD_DURATION_MS = 2 * 60 * 1000;

function registerSeatSocket(io) {
  io.on('connection', (socket) => {
    socket.on('join-event', (eventId) => {
      if (mongoose.isValidObjectId(eventId)) socket.join(`event:${eventId}`);
    });

    socket.on('leave-event', (eventId) => {
      socket.leave(`event:${eventId}`);
    });

    socket.on('hold-seat', async ({ eventId, seatId, userId }) => {
      if (![eventId, seatId, userId].every((id) => mongoose.isValidObjectId(id))) {
        socket.emit('hold-failed', { seatId, reason: 'Invalid seat request' });
        return;
      }

      const seat = await Seat.findOneAndUpdate(
        { _id: seatId, event: eventId, status: 'available' },
        { status: 'held', heldBy: userId, holdExpiresAt: new Date(Date.now() + HOLD_DURATION_MS) },
        { returnDocument: 'after' }
      );
      if (!seat) {
        socket.emit('hold-failed', { seatId, reason: 'Seat no longer available' });
        return;
      }
      socket.emit('hold-success', { seatId: seat._id, expiresAt: seat.holdExpiresAt });
      io.to(`event:${eventId}`).emit('seat-updated', {
        seatId: seat._id,
        status: 'held',
        heldBy: userId,
        holdExpiresAt: seat.holdExpiresAt
      });
    });

    socket.on('release-seat', async ({ eventId, seatId, userId }) => {
      const seat = await Seat.findOneAndUpdate(
        { _id: seatId, event: eventId, heldBy: userId, status: 'held' },
        { status: 'available', heldBy: null, holdExpiresAt: null },
        { returnDocument: 'after' }
      );
      if (seat) io.to(`event:${eventId}`).emit('seat-updated', { seatId: seat._id, status: 'available' });
    });
  });

  const holdSweeper = setInterval(async () => {
    try {
      const expired = await Seat.find({ status: 'held', holdExpiresAt: { $lt: new Date() } });
      for (const seat of expired) {
        seat.status = 'available';
        seat.heldBy = null;
        seat.holdExpiresAt = null;
        await seat.save();
        io.to(`event:${seat.event}`).emit('seat-updated', { seatId: seat._id, status: 'available' });
      }
    } catch (error) {
      console.error('Seat hold sweep failed:', error.message);
    }
  }, 15_000);
  holdSweeper.unref();
}

module.exports = { registerSeatSocket };
