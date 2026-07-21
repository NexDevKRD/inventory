import { RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from '../lib/errors';

export function authorize(permissionKey: string): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!req.user.permissions.includes(permissionKey)) return next(new ForbiddenError(`Missing permission: ${permissionKey}`));
    next();
  };
}
