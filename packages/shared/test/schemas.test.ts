import { describe, it, expect } from 'vitest';
import { loginSchema, createUserSchema } from '../src';

describe('loginSchema', () => {
  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'x'.repeat(8) });
    expect(result.success).toBe(false);
  });
  it('accepts valid payload', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: 'x'.repeat(8) });
    expect(result.success).toBe(true);
  });
});

describe('createUserSchema', () => {
  it('requires at least one roleId', () => {
    const result = createUserSchema.safeParse({
      email: 'a@b.com', firstName: 'A', lastName: 'B', roleIds: [],
    });
    expect(result.success).toBe(false);
  });
});
