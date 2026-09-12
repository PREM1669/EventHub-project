require('dotenv').config();

const cors = require('cors');
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const authRoutes = require('./routes/authRoutes');
const portalRoutes = require('./routes/portalRoutes');
const eventRoutes = require('./routes/eventRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/events', eventRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log('client connected', socket.id);
});

const port = process.env.PORT || 5000;

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  server.listen(port, () => console.log(`Server running on port ${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Mongo connection error:', error);
    process.exitCode = 1;
  });
}

module.exports = { app, io, server, start };
