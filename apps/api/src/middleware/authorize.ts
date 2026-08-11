import { RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from '../lib/errors';

export function authorize(permissionKey: string): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!req.user.permissions.includes(permissionKey)) return next(new ForbiddenError(`Missing permission: ${permissionKey}`));
    next();
  };
}

/**
 * Passes when the caller holds ANY of the listed permissions. Used where one
 * route serves both a scoped and an unscoped audience (a doctor viewing their
 * own requests vs. a manager viewing all of them); the handler then narrows the
 * result set based on which permission the caller actually has.
 */
export function authorizeAny(...permissionKeys: string[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!permissionKeys.some((key) => req.user!.permissions.includes(key))) {
      return next(new ForbiddenError(`Missing permission: one of ${permissionKeys.join(', ')}`));
    }
    next();
  };
}
