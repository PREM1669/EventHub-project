const cors = require('cors');
const express = require('express');
const authRoutes = require('./routes/authRoutes');
const portalRoutes = require('./routes/portalRoutes');
const eventRoutes = require('./routes/eventRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const organizerRoutes = require('./routes/organizerRoutes');
const checkinRoutes = require('./routes/checkinRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use((req, res, next) => {
  req.io = app.io;
  next();
});
app.use('/api/auth', authRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/organizer/events', organizerRoutes);
app.use('/api/checkin', checkinRoutes);

module.exports = app;
