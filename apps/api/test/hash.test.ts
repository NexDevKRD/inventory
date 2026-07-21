import { hashPassword, comparePassword, hashToken } from '../src/lib/hash';

describe('hash lib', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('Secret123!');
    expect(await comparePassword('Secret123!', hash)).toBe(true);
    expect(await comparePassword('wrong', hash)).toBe(false);
  });
  it('produces a deterministic token hash', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe('abc');
  });
});
