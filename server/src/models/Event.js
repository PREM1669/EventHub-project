const mongoose = require('mongoose');

const priceTierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  seatCount: { type: Number, required: true, min: 1 }
}, { _id: false });

const eventSchema = new mongoose.Schema({
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'General', trim: true },
  venue: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  capacity: { type: Number, required: true, min: 1 },
  priceTiers: { type: [priceTierSchema], required: true, validate: {
    validator: (tiers) => tiers.length > 0,
    message: 'At least one price tier is required'
  } },
  status: { type: String, enum: ['draft', 'published', 'closed'], default: 'draft' }
}, { timestamps: true });

eventSchema.index({ title: 'text', description: 'text' });
eventSchema.index({ category: 1, date: 1 });

module.exports = mongoose.model('Event', eventSchema);
