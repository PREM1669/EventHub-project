require('dotenv').config();

const cors = require('cors');
const dns = require('dns');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const app = require('./app');
const { registerSeatSocket } = require('./sockets/seatSocket');

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.io = io;

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
