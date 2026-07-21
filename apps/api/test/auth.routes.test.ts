import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/hash';
import { RoleName } from '@inventory/shared';

describe('POST /api/v1/auth/login', () => {
  beforeAll(async () => {
    const role = await prisma.role.upsert({ where: { name: RoleName.DOCTOR }, update: {}, create: { name: RoleName.DOCTOR, isSystem: true } });
    const passwordHash = await hashPassword('RoutesPass1!');
    await prisma.user.create({ data: { email: 'routes@example.com', passwordHash, firstName: 'R', lastName: 'T', roles: { create: [{ roleId: role.id }] } } });
  });
  afterAll(async () => {
    await prisma.user.delete({ where: { email: 'routes@example.com' } });
    await prisma.$disconnect();
  });

  it('returns 200 and sets refresh cookie on valid login', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'routes@example.com', password: 'RoutesPass1!' });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers['set-cookie']?.[0]).toMatch(/refreshToken=/);
  });

  it('returns 401 on invalid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'routes@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 on malformed body', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});
