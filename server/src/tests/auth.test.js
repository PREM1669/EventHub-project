require('./setup');
const request = require('supertest');
const app = require('../app');

describe('authentication', () => {
  it('registers and returns a token', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Alice', email: 'alice@test.com', password: 'pass123', role: 'attendee'
    });
    expect(response.status).toBe(201);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.role).toBe('attendee');
  });

  it('rejects duplicate email registration', async () => {
    const payload = { name: 'A', email: 'duplicate@test.com', password: 'pass123', role: 'attendee' };
    await request(app).post('/api/auth/register').send(payload);
    const response = await request(app).post('/api/auth/register').send({ ...payload, role: 'organizer' });
    expect(response.status).toBe(409);
  });

  it('logs in and rejects a wrong password', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Bob', email: 'bob@test.com', password: 'secret1', role: 'organizer'
    });
    const login = await request(app).post('/api/auth/login').send({ email: 'bob@test.com', password: 'secret1' });
    const wrongPassword = await request(app).post('/api/auth/login').send({ email: 'bob@test.com', password: 'wrong' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeDefined();
    expect(wrongPassword.status).toBe(401);
  });

  it('blocks attendees from organizer event routes', async () => {
    const registration = await request(app).post('/api/auth/register').send({
      name: 'Carl', email: 'carl@test.com', password: 'pass123', role: 'attendee'
    });
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${registration.body.token}`)
      .send({ title: 'Blocked', venue: 'Hall', date: new Date(Date.now() + 86400000), capacity: 1, priceTiers: [{ name: 'General', price: 50, seatCount: 1 }] });
    expect(response.status).toBe(403);
  });
});
