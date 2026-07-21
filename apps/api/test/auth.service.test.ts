import crypto from 'crypto';
import { authService } from '../src/services/auth.service';
import { prisma } from '../src/lib/prisma';
import { hashPassword, hashToken } from '../src/lib/hash';
import { passwordResetTokenRepository } from '../src/repositories/passwordResetToken.repository';
import { RoleName } from '@inventory/shared';

describe('authService', () => {
  let userId: string;

  beforeAll(async () => {
    const role = await prisma.role.upsert({ where: { name: RoleName.DOCTOR }, update: {}, create: { name: RoleName.DOCTOR, isSystem: true } });
    const passwordHash = await hashPassword('CorrectHorse1!');
    const user = await prisma.user.create({
      data: { email: 'test.auth@example.com', passwordHash, firstName: 'T', lastName: 'U', roles: { create: [{ roleId: role.id }] } },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.userRole.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('logs in with correct credentials', async () => {
    const result = await authService.login({ email: 'test.auth@example.com', password: 'CorrectHorse1!' }, { ipAddress: '127.0.0.1', userAgent: 'jest' });
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it('locks the account after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await expect(
        authService.login({ email: 'test.auth@example.com', password: 'wrong' }, { ipAddress: '127.0.0.1', userAgent: 'jest' })
      ).rejects.toThrow();
    }
    await expect(
      authService.login({ email: 'test.auth@example.com', password: 'CorrectHorse1!' }, { ipAddress: '127.0.0.1', userAgent: 'jest' })
    ).rejects.toThrow(/locked/i);
  });

  it('rotates refresh tokens and detects reuse', async () => {
    await prisma.user.update({ where: { id: userId }, data: { failedLoginCount: 0, lockedUntil: null } });
    const { refreshToken } = await authService.login({ email: 'test.auth@example.com', password: 'CorrectHorse1!' }, { ipAddress: '127.0.0.1', userAgent: 'jest' });
    const rotated = await authService.refresh(refreshToken, { ipAddress: '127.0.0.1', userAgent: 'jest' });
    expect(rotated.accessToken).toBeDefined();
    // reuse of the original (now-revoked) token must revoke everything and throw
    await expect(authService.refresh(refreshToken, { ipAddress: '127.0.0.1', userAgent: 'jest' })).rejects.toThrow();
    await expect(authService.refresh(rotated.refreshToken, { ipAddress: '127.0.0.1', userAgent: 'jest' })).rejects.toThrow();
  });

  it('requestPasswordReset stores a hashed, opaque, time-limited token (not a JWT)', async () => {
    await prisma.user.update({ where: { id: userId }, data: { failedLoginCount: 0, lockedUntil: null } });
    await authService.requestPasswordReset('test.auth@example.com');

    const stored = await prisma.passwordResetToken.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    expect(stored).toBeTruthy();
    expect(stored!.usedAt).toBeNull();
    expect(stored!.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(stored!.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 16 * 60_000);
    // stored value must be a hash, not a JWT (no '.' segments like a JWT would have)
    expect(stored!.tokenHash).not.toContain('.');
    expect(stored!.tokenHash).toHaveLength(64); // sha256 hex digest
  });

  it('resets the password with a valid single-use token and revokes sessions', async () => {
    const rawToken = crypto.randomBytes(32).toString('base64url');
    await passwordResetTokenRepository.create({
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 15 * 60_000),
    });

    // seed an active refresh token so we can assert it gets revoked by the reset
    const { refreshToken } = await authService.login({ email: 'test.auth@example.com', password: 'CorrectHorse1!' }, { ipAddress: '127.0.0.1', userAgent: 'jest' });

    await authService.resetPassword(rawToken, 'NewCorrectHorse2!');

    // old password no longer works, new one does
    await expect(
      authService.login({ email: 'test.auth@example.com', password: 'CorrectHorse1!' }, { ipAddress: '127.0.0.1', userAgent: 'jest' })
    ).rejects.toThrow();
    const loginResult = await authService.login({ email: 'test.auth@example.com', password: 'NewCorrectHorse2!' }, { ipAddress: '127.0.0.1', userAgent: 'jest' });
    expect(loginResult.accessToken).toBeDefined();

    // token is single-use: reusing it must be rejected
    await expect(authService.resetPassword(rawToken, 'AnotherPassword3!')).rejects.toThrow();

    // the refresh token issued before the reset was revoked
    await expect(authService.refresh(refreshToken, { ipAddress: '127.0.0.1', userAgent: 'jest' })).rejects.toThrow();
  });

  it('rejects an expired reset token', async () => {
    const rawToken = crypto.randomBytes(32).toString('base64url');
    await passwordResetTokenRepository.create({
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() - 60_000), // already expired
    });

    await expect(authService.resetPassword(rawToken, 'SomePassword4!')).rejects.toThrow(/invalid|expired/i);
  });
});
