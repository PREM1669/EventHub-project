require('dotenv').config();

const bcrypt = require('bcryptjs');
const dns = require('dns');
const mongoose = require('mongoose');
const Event = require('./models/Event');
const Seat = require('./models/Seat');
const User = require('./models/User');
const { arrangeSeats, generateSeats } = require('./services/seatGenerator');

dns.setServers(
  (process.env.MONGO_DNS_SERVERS || '1.1.1.1,8.8.8.8')
    .split(',')
    .map((server) => server.trim())
);

const credentials = {
  organizer: {
    name: 'Demo Organizer',
    email: 'organizer@eventhub.local',
    password: 'Organizer123!'
  },
  attendee: {
    name: 'Demo Attendee',
    email: 'attendee@eventhub.local',
    password: 'Attendee123!'
  }
};

async function upsertUser({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return User.findOneAndUpdate(
    { email },
    { name, email, passwordHash, role },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  const organizer = await upsertUser({ ...credentials.organizer, role: 'organizer' });
  await upsertUser({ ...credentials.attendee, role: 'attendee' });

  const events = [
    {
      title: 'Future Builders Summit',
      description: 'A practical technology conference for people building the next generation of products.',
      category: 'Technology',
      venue: 'Innovation Hall',
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      capacity: 120,
      priceTiers: [
        { name: 'General', price: 500, seatCount: 90 },
        { name: 'VIP', price: 1300, seatCount: 30 }
      ]
    },
    {
      title: 'Sunset Live Sessions',
      description: 'An open-air evening of live music, food, and community.',
      category: 'Music',
      venue: 'Riverside Amphitheatre',
      date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      capacity: 200,
      priceTiers: [
        { name: 'General', price: 350, seatCount: 160 },
        { name: 'Premium', price: 890, seatCount: 40 }
      ]
    }
  ];

  for (const event of events) {
    const savedEvent = await Event.findOneAndUpdate(
      { organizer: organizer._id, title: event.title },
      { ...event, organizer: organizer._id, status: 'published' },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    await generateSeats(savedEvent);
    await arrangeSeats(savedEvent);
    for (const tier of event.priceTiers) {
      await Seat.updateMany({ event: savedEvent._id, tier: tier.name }, { price: tier.price });
    }
  }

  console.log('Seed complete.');
  console.log(`Organizer: ${credentials.organizer.email} / ${credentials.organizer.password}`);
  console.log(`Attendee: ${credentials.attendee.email} / ${credentials.attendee.password}`);
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
