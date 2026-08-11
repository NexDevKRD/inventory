import { RequestHandler } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { UnauthorizedError } from '../lib/errors';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; email: string; roles: string[]; permissions: string[] };
    }
  }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new UnauthorizedError('Missing access token'));
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = payload;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired access token'));
  }
};
