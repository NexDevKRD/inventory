import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export interface AccessTokenPayload {
  userId: string;
  // Carried so the client can rebuild its session on reload without an extra
  // round-trip — the access token is the only user context it keeps.
  email: string;
  roles: string[];
  permissions: string[];
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(userId: string): string {
  // jti ensures uniqueness even when multiple tokens are issued for the same
  // user within the same second (jwt iat has only second-level granularity).
  return jwt.sign({ userId, jti: crypto.randomUUID() }, REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, REFRESH_SECRET) as { userId: string };
}
