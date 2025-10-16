const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../server');

let mongoServer;
jest.setTimeout(30000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri.replace(/\/$/, '');
  process.env.JWT_SECRET = 'test_jwt_secret';
  await mongoose.connect(process.env.MONGODB_URI + '/splitsy');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Auth controller error paths', () => {
  test('duplicate registration returns 400', async () => {
    const r1 = await request(app).post('/api/auth/register').send({ name: 'Err1', email: 'err1@test.com', password: 'Passw0rd' });
    expect(r1.statusCode).toBe(201);

    const r2 = await request(app).post('/api/auth/register').send({ name: 'Err1', email: 'err1@test.com', password: 'Passw0rd' });
    expect(r2.statusCode).toBe(400);
    expect(r2.body.message).toMatch(/User already exists/i);
  });

  test('login with invalid credentials returns 401', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Err2', email: 'err2@test.com', password: 'Passw0rd' });
    const login = await request(app).post('/api/auth/login').send({ email: 'err2@test.com', password: 'wrong' });
    expect(login.statusCode).toBe(401);
    expect(login.body.message).toMatch(/Invalid credentials/i);
  });
});
