require('dotenv').config();

const cors = require('cors');
const dns = require('dns');
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const authRoutes = require('./routes/authRoutes');
const portalRoutes = require('./routes/portalRoutes');
const eventRoutes = require('./routes/eventRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const { registerSeatSocket } = require('./sockets/seatSocket');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use('/api/auth', authRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);

registerSeatSocket(io);

const port = process.env.PORT || 5000;

dns.setServers(
  (process.env.MONGO_DNS_SERVERS || '1.1.1.1,8.8.8.8')
    .split(',')
    .map((server) => server.trim())
);

function connectToDatabase() {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((error) => {
      console.error('Mongo connection error:', error.message);
      setTimeout(connectToDatabase, 5000);
    });
}

function start() {
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
    connectToDatabase();
  });
}

if (require.main === module) {
  start();
}

module.exports = { app, io, server, start };
