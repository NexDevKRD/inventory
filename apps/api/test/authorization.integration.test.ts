import request from 'supertest';
import { app } from '../src/app';
import { signAccessToken } from '../src/lib/jwt';

describe('cross-role authorization', () => {
  it('403s when a DOCTOR-role token hits an admin-only user-management route', async () => {
    const token = signAccessToken({ userId: 'doctor-1', roles: ['DOCTOR'], permissions: [] });
    const res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('401s with no token at all', async () => {
    const res = await request(app).get('/api/v1/users');
    expect(res.status).toBe(401);
  });
});
