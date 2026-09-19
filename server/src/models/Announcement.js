const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, trim: true, maxlength: 1000 }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
