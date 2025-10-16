const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../server');
const Transaction = require('../models/Transaction');

let mongoServer;

jest.setTimeout(30000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Match the existing tests' URI handling: trim a trailing slash if present
  process.env.MONGODB_URI = uri.replace(/\/\/??$/, '');
  // Use the test JWT secret
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

  // Connect to the in-memory DB plus a named database for consistency
  await mongoose.connect(process.env.MONGODB_URI + '/splitsy');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Transactions full flow', () => {
  let token1, token2, token3, id1, id2, id3, groupId;

  test('register three users', async () => {
    const r1 = await request(app).post('/api/auth/register').send({ name: 'T1', email: 't1@test.com', password: 'Passw0rd' });
    expect(r1.statusCode).toBe(201);
    token1 = r1.body.token;

    const r2 = await request(app).post('/api/auth/register').send({ name: 'T2', email: 't2@test.com', password: 'Passw0rd' });
    expect(r2.statusCode).toBe(201);
    token2 = r2.body.token;

    const r3 = await request(app).post('/api/auth/register').send({ name: 'T3', email: 't3@test.com', password: 'Passw0rd' });
    expect(r3.statusCode).toBe(201);
    token3 = r3.body.token;

    const me1 = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token1}`);
    const me2 = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token2}`);
    const me3 = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token3}`);
    id1 = me1.body.id || me1.body._id;
    id2 = me2.body.id || me2.body._id;
    id3 = me3.body.id || me3.body._id;
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id3).toBeDefined();
  });

  test('create group and add members', async () => {
    const g = await request(app).post('/api/groups').set('Authorization', `Bearer ${token1}`).send({ name: 'TxGroup' });
    expect(g.statusCode).toBe(201);
    groupId = g.body.group._id || g.body.group.id;

    // add members by email
    const a2 = await request(app).post(`/api/groups/${groupId}/members`).set('Authorization', `Bearer ${token1}`).send({ email: 't2@test.com' });
    expect(a2.statusCode).toBe(200);
    const a3 = await request(app).post(`/api/groups/${groupId}/members`).set('Authorization', `Bearer ${token1}`).send({ email: 't3@test.com' });
    expect(a3.statusCode).toBe(200);
  });

  test('create exact split transaction and verify amounts', async () => {
    const payload = {
      description: 'Exact Split Test',
      amount: 120,
      currency: 'USD',
      payer: id1,
      group: groupId,
      splitMethod: 'exact',
      participants: [
        { user: id1, amount: 40 },
        { user: id2, amount: 40 },
        { user: id3, amount: 40 }
      ],
      createdBy: id1
    };

    const res = await request(app).post('/api/transactions').set('Authorization', `Bearer ${token1}`).send(payload);
    expect([200,201]).toContain(res.statusCode);
    const tx = res.body.data;
    expect(tx.participants.length).toBe(3);
    const total = tx.participants.reduce((s,p) => s + p.amount, 0);
    expect(Math.abs(total - 120)).toBeLessThanOrEqual(0.01);
  });

  test('create percentage split transaction and validate calculated amounts', async () => {
    const payload = {
      description: 'Percentage Split',
      amount: 100,
      currency: 'USD',
      payer: id2,
      group: groupId,
      splitMethod: 'percentage',
      participants: [
        { user: id1, percentage: 50 },
        { user: id2, percentage: 30 },
        { user: id3, percentage: 20 }
      ],
      createdBy: id2
    };

    const res = await request(app).post('/api/transactions').set('Authorization', `Bearer ${token2}`).send(payload);
    expect([200,201]).toContain(res.statusCode);
    const tx = res.body.data;
    // Verify percentages produced amounts roughly matching expectations
    const p1 = tx.participants.find(p => p.user === id1 || p.user._id === id1 || p.user === id1.toString());
    const p2 = tx.participants.find(p => p.user === id2 || p.user._id === id2 || p.user === id2.toString());
    const p3 = tx.participants.find(p => p.user === id3 || p.user._id === id3 || p.user === id3.toString());
    expect(p1).toBeDefined(); expect(p2).toBeDefined(); expect(p3).toBeDefined();
    const sum = p1.amount + p2.amount + p3.amount;
    expect(Math.abs(sum - 100)).toBeLessThanOrEqual(0.02);
  });

  test('settle a transaction by marking participants paid and confirm settled status', async () => {
    // create a small transaction with two participants
    const payload = {
      description: 'Settle Test',
      amount: 50,
      currency: 'USD',
      payer: id1,
      group: groupId,
      splitMethod: 'equal',
      participants: [ { user: id1, amount: 25 }, { user: id2, amount: 25 } ],
      createdBy: id1
    };

    const res = await request(app).post('/api/transactions').set('Authorization', `Bearer ${token1}`).send(payload);
    expect([200,201]).toContain(res.statusCode);
    const txId = res.body.data._id || res.body.data.id;

    // participant 2 marks paid
    const settle2 = await request(app).post(`/api/transactions/${txId}/settle`).set('Authorization', `Bearer ${token2}`).send({});
    expect(settle2.statusCode).toBe(200);

    // payer marks paid (payer normally paid already but mark to simulate)
    const settle1 = await request(app).post(`/api/transactions/${txId}/settle`).set('Authorization', `Bearer ${token1}`).send({});
    expect(settle1.statusCode).toBe(200);

    const gettx = await request(app).get(`/api/transactions/${txId}`).set('Authorization', `Bearer ${token1}`);
    expect(gettx.statusCode).toBe(200);
    expect(gettx.body.data.status).toBe('settled');
    expect(gettx.body.data.settledAt).toBeDefined();
  });

  test('approvals: create tx and add approvals to mark approved', async () => {
    const payload = {
      description: 'Approval Test',
      amount: 90,
      currency: 'USD',
      payer: id3,
      group: groupId,
      splitMethod: 'equal',
      participants: [ { user: id1, amount: 30 }, { user: id2, amount: 30 }, { user: id3, amount: 30 } ],
      createdBy: id3
    };

    const res = await request(app).post('/api/transactions').set('Authorization', `Bearer ${token3}`).send(payload);
    expect([200,201]).toContain(res.statusCode);
    const txId = res.body.data._id || res.body.data.id;

    // Use model to add approvals since no dedicated endpoint exists
    const txModel = await Transaction.findById(txId);
    await txModel.addApproval(id1, true, 'ok');
    // Not yet approved until all participants approve
    let after1 = await Transaction.findById(txId);
    expect(after1.status === 'pending' || after1.status === 'pending' ).toBeTruthy();

    await txModel.addApproval(id2, true, 'ok');
    await txModel.addApproval(id3, true, 'ok');

    const afterAll = await Transaction.findById(txId);
    expect(afterAll.status === 'approved' || afterAll.status === 'approved').toBeTruthy();
  });

  test('update and delete transaction', async () => {
    const payload = {
      description: 'To Delete',
      amount: 10,
      currency: 'USD',
      payer: id1,
      group: groupId,
      splitMethod: 'equal',
      participants: [ { user: id1, amount: 10 } ],
      createdBy: id1
    };

    const res = await request(app).post('/api/transactions').set('Authorization', `Bearer ${token1}`).send(payload);
    expect([200,201]).toContain(res.statusCode);
    const txId = res.body.data._id || res.body.data.id;

    // update notes
    const up = await request(app).put(`/api/transactions/${txId}`).set('Authorization', `Bearer ${token1}`).send({ notes: 'updated' });
    expect(up.statusCode).toBe(200);
    expect(up.body.data.notes).toBe('updated');

    // delete
    const del = await request(app).delete(`/api/transactions/${txId}`).set('Authorization', `Bearer ${token1}`);
    expect(del.statusCode).toBe(200);

    const get = await request(app).get(`/api/transactions/${txId}`).set('Authorization', `Bearer ${token1}`);
    expect(get.statusCode).toBe(404);
  });
});
