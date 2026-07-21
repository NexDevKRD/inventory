export class AppError extends Error {
  constructor(public statusCode: number, public code: string, message: string) {
    super(message);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') { super(401, 'UNAUTHORIZED', message); }
}
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super(403, 'FORBIDDEN', message); }
}
export class NotFoundError extends AppError {
  constructor(message = 'Not found') { super(404, 'NOT_FOUND', message); }
}
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', public details?: unknown) { super(400, 'VALIDATION_ERROR', message); }
}
export class ConflictError extends AppError {
  constructor(message = 'Conflict') { super(409, 'CONFLICT', message); }
}
