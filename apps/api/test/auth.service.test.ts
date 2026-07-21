import { authService } from '../src/services/auth.service';
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/hash';
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
});
