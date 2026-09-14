const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  label: { type: String, required: true },
  row: { type: String, required: true },
  tier: { type: String, required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ['available', 'held', 'booked'], default: 'available' },
  heldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  holdExpiresAt: { type: Date, default: null }
});

seatSchema.index({ event: 1, status: 1 });
seatSchema.index({ holdExpiresAt: 1 });
seatSchema.index({ event: 1, label: 1 }, { unique: true });

module.exports = mongoose.model('Seat', seatSchema);
