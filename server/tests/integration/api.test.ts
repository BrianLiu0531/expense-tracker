import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';

const app = createApp();

async function signUp(email: string, region: 'AU' | 'NZ' = 'AU') {
  const agent = request.agent(app);
  const res = await agent
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: 'password123', region });
  expect(res.status).toBe(201);
  return agent;
}

const sample = {
  type: 'EXPENSE',
  amountCents: 2200,
  category: 'Dining',
  description: 'Flat white and banana bread',
  date: '2025-08-15',
  gstApplicable: true,
};

beforeAll(async () => {
  await prisma.transaction.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('auth', () => {
  it('registers, reads the session and logs out', async () => {
    const agent = await signUp('alice@example.com');
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ email: 'alice@example.com', region: 'AU' });
    expect(me.body.user.passwordHash).toBeUndefined();

    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  it('rejects duplicate emails', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Again', email: 'ALICE@example.com', password: 'password123' })
      .expect(409);
  });

  it('rejects a wrong password', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'wrong-password' })
      .expect(401);
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'password123' })
      .expect(200);
    expect(res.headers['set-cookie']?.[0]).toMatch(/HttpOnly/);
  });
});

describe('transactions', () => {
  it('requires authentication', async () => {
    await request(app).get('/api/transactions').expect(401);
  });

  it('supports create, list, update and delete', async () => {
    const agent = await signUp('bob@example.com');

    const created = await agent.post('/api/transactions').send(sample).expect(201);
    expect(created.body).toMatchObject({ ...sample, id: expect.any(String) });

    const list = await agent.get('/api/transactions').expect(200);
    expect(list.body.total).toBe(1);

    const updated = await agent
      .put(`/api/transactions/${created.body.id}`)
      .send({ ...sample, amountCents: 3300 })
      .expect(200);
    expect(updated.body.amountCents).toBe(3300);

    await agent.delete(`/api/transactions/${created.body.id}`).expect(204);
    const after = await agent.get('/api/transactions').expect(200);
    expect(after.body.total).toBe(0);
  });

  it('filters by type, date range and search text', async () => {
    const agent = await signUp('filter@example.com');
    await agent.post('/api/transactions').send(sample).expect(201);
    await agent
      .post('/api/transactions')
      .send({ ...sample, type: 'INCOME', category: 'Salary', description: 'Pay day', date: '2025-09-01' })
      .expect(201);

    const income = await agent.get('/api/transactions?type=INCOME').expect(200);
    expect(income.body.items).toHaveLength(1);

    const august = await agent.get('/api/transactions?from=2025-08-01&to=2025-08-31').expect(200);
    expect(august.body.items[0].category).toBe('Dining');

    const search = await agent.get('/api/transactions?search=BANANA').expect(200);
    expect(search.body.total).toBe(1);
  });

  it('rejects invalid input', async () => {
    const agent = await signUp('carol@example.com');
    const res = await agent
      .post('/api/transactions')
      .send({ ...sample, amountCents: -5, date: '2025-02-30' })
      .expect(400);
    expect(res.body.issues.map((i: { path: string }) => i.path)).toEqual(
      expect.arrayContaining(['amountCents', 'date']),
    );
  });

  it("prevents access to another user's transactions", async () => {
    const owner = await signUp('owner@example.com');
    const intruder = await signUp('intruder@example.com');
    const created = await owner.post('/api/transactions').send(sample).expect(201);

    await intruder.put(`/api/transactions/${created.body.id}`).send(sample).expect(404);
    await intruder.delete(`/api/transactions/${created.body.id}`).expect(404);
    const list = await intruder.get('/api/transactions').expect(200);
    expect(list.body.total).toBe(0);
  });

  it('exports CSV', async () => {
    const agent = await signUp('csv@example.com');
    await agent.post('/api/transactions').send(sample).expect(201);
    const res = await agent.get('/api/transactions/export.csv').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('"2025-08-15","EXPENSE","Dining","Flat white and banana bread","22.00","2.00"');
  });
});

describe('reports', () => {
  it('summarises a financial year using the user region', async () => {
    const agent = await signUp('nz@example.com', 'NZ');
    await agent
      .post('/api/transactions')
      .send({ ...sample, type: 'INCOME', category: 'Freelance', amountCents: 115000, date: '2025-04-01' })
      .expect(201);
    // Falls in the next NZ tax year, so it must be excluded
    await agent.post('/api/transactions').send({ ...sample, date: '2026-04-01' }).expect(201);

    const res = await agent.get('/api/reports/summary?fy=2026').expect(200);
    expect(res.body.range).toEqual({ from: '2025-04-01', to: '2026-03-31' });
    expect(res.body.totals).toMatchObject({ income: 115000, expense: 0, gstCollected: 15000 });
  });
});
