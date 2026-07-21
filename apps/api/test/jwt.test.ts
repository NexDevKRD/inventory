import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from '../src/lib/jwt';

describe('jwt lib', () => {
  it('round-trips an access token payload', () => {
    const token = signAccessToken({ userId: 'u1', roles: ['DOCTOR'], permissions: ['x'] });
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe('u1');
  });
  it('round-trips a refresh token', () => {
    const token = signRefreshToken('u1');
    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe('u1');
  });
  it('throws on tampered token', () => {
    const token = signAccessToken({ userId: 'u1', roles: [], permissions: [] });
    expect(() => verifyAccessToken(token + 'x')).toThrow();
  });
});
