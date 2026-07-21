import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/hash';
import { RoleName } from '@inventory/shared';

describe('POST /api/v1/auth/login', () => {
  let userId: string;

  beforeAll(async () => {
    const role = await prisma.role.upsert({ where: { name: RoleName.DOCTOR }, update: {}, create: { name: RoleName.DOCTOR, isSystem: true } });
    const passwordHash = await hashPassword('RoutesPass1!');
    const user = await prisma.user.create({ data: { email: 'routes@example.com', passwordHash, firstName: 'R', lastName: 'T', roles: { create: [{ roleId: role.id }] } } });
    userId = user.id;
  });
  afterAll(async () => {
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.userRole.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('returns 200 and sets refresh cookie on valid login', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'routes@example.com', password: 'RoutesPass1!' });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers['set-cookie']?.[0]).toMatch(/refreshToken=/);
  });

  it('returns 401 on invalid credentials', async () => {
    // NOTE: brief's original fixture used password 'wrong' (5 chars), which fails
    // loginSchema's min(8) validation and yields 400 before reaching authService,
    // colliding with the malformed-body test's intent. Using an 8+ char wrong
    // password here so this test actually exercises authService's 401 path.
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'routes@example.com', password: 'WrongPass1!' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 on malformed body', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});
