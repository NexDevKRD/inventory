import { RequestHandler } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../lib/errors';

export function validate(schema: ZodSchema): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(new ValidationError('Invalid request body', result.error.flatten()));
    req.body = result.data;
    next();
  };
}
