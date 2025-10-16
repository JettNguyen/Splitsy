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

describe('Extra controller branches', () => {
  let tokenA, tokenB, idA, idB, groupId, txId, pmId;

  test('register users and getMe/updateDetails', async () => {
    const rA = await request(app).post('/api/auth/register').send({ name: 'ExA', email: 'exa@test.com', password: 'Passw0rd' });
    expect(rA.statusCode).toBe(201);
    tokenA = rA.body.token;
    idA = rA.body.user.id || rA.body.user._id;

    const rB = await request(app).post('/api/auth/register').send({ name: 'ExB', email: 'exb@test.com', password: 'Passw0rd' });
    expect(rB.statusCode).toBe(201);
    tokenB = rB.body.token;
    idB = rB.body.user.id || rB.body.user._id;

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenA}`);
    expect(me.statusCode).toBe(200);
    expect(me.body._id || me.body.id).toBeDefined();

    const upd = await request(app).put('/api/auth/me').set('Authorization', `Bearer ${tokenA}`).send({ name: 'ExA2', phoneNumber: '12345' });
    expect(upd.statusCode).toBe(200);
    expect(upd.body.data.user.name).toBe('ExA2');
  });

  test('updatePassword then login with new password', async () => {
    const change = await request(app).put('/api/auth/updatepassword').set('Authorization', `Bearer ${tokenA}`).send({ currentPassword: 'Passw0rd', newPassword: 'NewPass1' });
    expect(change.statusCode).toBe(200);
    expect(change.body.data.token).toBeDefined();

    const loginOld = await request(app).post('/api/auth/login').send({ email: 'exa@test.com', password: 'Passw0rd' });
    expect(loginOld.statusCode).toBe(401);

    const loginNew = await request(app).post('/api/auth/login').send({ email: 'exa@test.com', password: 'NewPass1' });
    expect(loginNew.statusCode).toBe(200);
  });

  test('add and remove payment method including duplicate check', async () => {
    // Ensure a user exists for this test (self-contained)
    if (!tokenA) {
      const r = await request(app).post('/api/auth/register').send({ name: 'TempPM', email: 'temp_pm@test.com', password: 'Passw0rd' });
      expect(r.statusCode).toBe(201);
      tokenA = r.body.token;
      idA = r.body.user.id || r.body.user._id;
    }

  const add1 = await request(app).post('/api/auth/payment-methods').set('Authorization', `Bearer ${tokenA}`).send({ type: 'Venmo', handle: '@exA', isDefault: true });
    expect(add1.statusCode).toBe(200);
    expect(add1.body.data.paymentMethods.length).toBeGreaterThanOrEqual(1);
    pmId = add1.body.data.paymentMethods[0]._id;

  const addDup = await request(app).post('/api/auth/payment-methods').set('Authorization', `Bearer ${tokenA}`).send({ type: 'Venmo', handle: '@exA' });
    expect(addDup.statusCode).toBe(400);

    const del = await request(app).delete(`/api/auth/payment-methods/${pmId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(del.statusCode).toBe(200);

    const delNotFound = await request(app).delete(`/api/auth/payment-methods/${pmId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(delNotFound.statusCode).toBe(404);
  });

  test('group update rights and delete with unsettled transactions', async () => {
    const g = await request(app).post('/api/groups').set('Authorization', `Bearer ${tokenA}`).send({ name: 'GExtra' });
    expect(g.statusCode).toBe(201);
    groupId = g.body.group._id || g.body.group.id;

    // Add member B
    const addB = await request(app).post(`/api/groups/${groupId}/members`).set('Authorization', `Bearer ${tokenA}`).send({ email: 'exb@test.com' });
    expect(addB.statusCode).toBe(200);

    // Attempt update as non-admin (B)
    const updNonAdmin = await request(app).put(`/api/groups/${groupId}`).set('Authorization', `Bearer ${tokenB}`).send({ name: 'ShouldFail' });
    expect(updNonAdmin.statusCode).toBe(403);

    // Create unsettled transaction where B is participant
    const tx = await request(app).post('/api/transactions').set('Authorization', `Bearer ${tokenA}`).send({ description: 'Unsettled', amount: 20, currency: 'USD', payer: idA, group: groupId, splitMethod: 'equal', participants: [{ user: idA, amount: 10 }, { user: idB, amount: 10 }], createdBy: idA });
    expect([200,201]).toContain(tx.statusCode);
    txId = tx.body.data._id || tx.body.data.id;

    // Try to delete group (should fail due to unsettled tx)
    const delG = await request(app).delete(`/api/groups/${groupId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(delG.statusCode).toBe(400);

    // Creator cannot leave
    const leave = await request(app).post(`/api/groups/${groupId}/leave`).set('Authorization', `Bearer ${tokenA}`).send();
    expect(leave.statusCode).toBe(400);

    // Try remove member who has unsettled transactions (should return 400)
    const rem = await request(app).delete(`/api/groups/${groupId}/members/${idB}`).set('Authorization', `Bearer ${tokenA}`);
    expect(rem.statusCode).toBe(400);
  });

  test('getGroup access denied and not found', async () => {
    // Access denied: create a new group where B is not member and attempt access
    const g2 = await request(app).post('/api/groups').set('Authorization', `Bearer ${tokenA}`).send({ name: 'PrivateG' });
    const g2id = g2.body.group._id || g2.body.group.id;
    const access = await request(app).get(`/api/groups/${g2id}`).set('Authorization', `Bearer ${tokenB}`);
    expect(access.statusCode).toBe(403);

    // Not found
    const notfound = await request(app).get(`/api/groups/6123456789abcdef01234567`).set('Authorization', `Bearer ${tokenA}`);
    expect(notfound.statusCode).toBe(404);
  });
});
