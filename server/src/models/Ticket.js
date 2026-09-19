const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  seat: { type: mongoose.Schema.Types.ObjectId, ref: 'Seat', required: true },
  qrToken: { type: String, required: true },
  checkedIn: { type: Boolean, default: false },
  checkedInAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
