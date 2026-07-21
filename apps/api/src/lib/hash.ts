import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
