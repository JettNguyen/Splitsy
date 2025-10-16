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

describe('Group controller error paths', () => {
  let token;
  test('create group validation error if missing name', async () => {
    const reg = await request(app).post('/api/auth/register').send({ name: 'G1', email: 'g1@test.com', password: 'Passw0rd' });
    token = reg.body.token;

    const create = await request(app).post('/api/groups').set('Authorization', `Bearer ${token}`).send({});
    expect(create.statusCode).toBe(400);
  });

  test('add member returns 404 if user not found', async () => {
    // create a valid group
    const grp = await request(app).post('/api/groups').set('Authorization', `Bearer ${token}`).send({ name: 'HasMembers' });
    expect(grp.statusCode).toBe(201);
    const groupId = grp.body.group._id || grp.body.group.id;

    const add = await request(app).post(`/api/groups/${groupId}/members`).set('Authorization', `Bearer ${token}`).send({ email: 'missing@test.com' });
    expect(add.statusCode).toBe(404);
  });
});
