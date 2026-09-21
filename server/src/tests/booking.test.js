require('./setup');
const request = require('supertest');
const app = require('../app');
const Booking = require('../models/Booking');
const Seat = require('../models/Seat');

async function register(role, email) {
  const response = await request(app).post('/api/auth/register').send({
    name: role, email, password: 'pass123', role
  });
  return { token: response.body.token, userId: response.body.user.id };
}

async function makeEvent(organizerToken) {
  const response = await request(app).post('/api/events')
    .set('Authorization', `Bearer ${organizerToken}`)
    .send({
      title: 'Test Event',
      venue: 'Test Hall',
      date: new Date(Date.now() + 3 * 86400000),
      capacity: 1,
      priceTiers: [{ name: 'General', price: 50, seatCount: 1 }]
    });
  await request(app).post(`/api/events/${response.body._id}/publish`)
    .set('Authorization', `Bearer ${organizerToken}`);
  const seat = await Seat.findOne({ event: response.body._id });
  return { eventId: response.body._id, seat };
}

async function holdSeat(seat, userId) {
  return Seat.findOneAndUpdate({
    _id: seat._id,
    status: 'available'
  }, {
    status: 'held',
    heldBy: userId,
    holdExpiresAt: new Date(Date.now() + 60000)
  }, { returnDocument: 'after' });
}

describe('booking and check-in flows', () => {
  it('books a held seat and creates a QR ticket', async () => {
    const organizer = await register('organizer', 'org-book@test.com');
    const attendee = await register('attendee', 'att-book@test.com');
    const { eventId, seat } = await makeEvent(organizer.token);
    await holdSeat(seat, attendee.userId);

    const response = await request(app).post('/api/bookings')
      .set('Authorization', `Bearer ${attendee.token}`)
      .send({ eventId, seatIds: [seat._id] });

    expect(response.status).toBe(201);
    expect(response.body.tickets[0].qrImage).toMatch(/^data:image\/png;base64/);
    expect((await Seat.findById(seat._id)).status).toBe('booked');
  });

  it('rejects booking a seat the attendee does not hold', async () => {
    const organizer = await register('organizer', 'org-nohold@test.com');
    const attendee = await register('attendee', 'att-nohold@test.com');
    const { eventId, seat } = await makeEvent(organizer.token);
    const response = await request(app).post('/api/bookings')
      .set('Authorization', `Bearer ${attendee.token}`)
      .send({ eventId, seatIds: [seat._id] });
    expect(response.status).toBe(409);
  });

  it('allows exactly one concurrent atomic hold', async () => {
    const organizer = await register('organizer', 'org-race@test.com');
    const first = await register('attendee', 'att-race-1@test.com');
    const second = await register('attendee', 'att-race-2@test.com');
    const { seat } = await makeEvent(organizer.token);
    const results = await Promise.all([
      holdSeat(seat, first.userId),
      holdSeat(seat, second.userId)
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('rejects tampered and reused check-in tokens', async () => {
    const organizer = await register('organizer', 'org-qr@test.com');
    const attendee = await register('attendee', 'att-qr@test.com');
    const { eventId, seat } = await makeEvent(organizer.token);
    await holdSeat(seat, attendee.userId);
    const booking = await request(app).post('/api/bookings')
      .set('Authorization', `Bearer ${attendee.token}`)
      .send({ eventId, seatIds: [seat._id] });
    const token = booking.body.tickets[0].qrToken;

    const tampered = await request(app).post('/api/checkin')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ qrToken: `${token.slice(0, -2)}xx` });
    const first = await request(app).post('/api/checkin')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ qrToken: token });
    const second = await request(app).post('/api/checkin')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ qrToken: token });

    expect(tampered.status).toBe(400);
    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(await Booking.countDocuments({ status: 'confirmed' })).toBe(1);
  });
});
