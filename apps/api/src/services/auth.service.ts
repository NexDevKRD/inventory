import crypto from 'crypto';
import { userRepository } from '../repositories/user.repository';
import { refreshTokenRepository } from '../repositories/refreshToken.repository';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { passwordResetTokenRepository } from '../repositories/passwordResetToken.repository';
import { comparePassword, hashPassword, hashToken } from '../lib/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { UnauthorizedError } from '../lib/errors';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const REFRESH_TTL_DAYS = 7;
const RESET_TOKEN_TTL_MINUTES = 15;

interface RequestMeta { ipAddress?: string; userAgent?: string }

function flattenPermissions(user: any): string[] {
  const set = new Set<string>();
  for (const ur of user.roles) for (const rp of ur.role.permissions ?? []) set.add(rp.permission.key);
  return [...set];
}

export const authService = {
  async login(input: { email: string; password: string }, meta: RequestMeta) {
    const user = await userRepository.findByEmail(input.email);
    if (!user) throw new UnauthorizedError('Invalid credentials');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedError('Account is locked, try again later');
    }

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      const nextCount = user.failedLoginCount + 1;
      const lockedUntil = nextCount >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null;
      await userRepository.incrementFailedLogin(user.id, lockedUntil);
      await auditLogRepository.create({ userId: user.id, action: 'LOGIN_FAILED', ipAddress: meta.ipAddress, userAgent: meta.userAgent });
      throw new UnauthorizedError('Invalid credentials');
    }

    await userRepository.resetFailedLogin(user.id);
    await auditLogRepository.create({ userId: user.id, action: 'LOGIN', ipAddress: meta.ipAddress, userAgent: meta.userAgent });

    const roles = user.roles.map((r: any) => r.role.name);
    const permissions = flattenPermissions(user);
    const accessToken = signAccessToken({ userId: user.id, email: user.email, roles, permissions });
    const refreshTokenRaw = signRefreshToken(user.id);
    await refreshTokenRepository.create({
      userId: user.id,
      tokenHash: hashToken(refreshTokenRaw),
      expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return { accessToken, refreshToken: refreshTokenRaw, user: { id: user.id, email: user.email, roles, permissions } };
  },

  async refresh(refreshTokenRaw: string, meta: RequestMeta) {
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshTokenRaw);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const stored = await refreshTokenRepository.findByHash(hashToken(refreshTokenRaw));
    if (!stored) throw new UnauthorizedError('Invalid refresh token');

    if (stored.revokedAt) {
      await refreshTokenRepository.revokeAllForUser(decoded.userId);
      await auditLogRepository.create({ userId: decoded.userId, action: 'SECURITY_REFRESH_REUSE', ipAddress: meta.ipAddress, userAgent: meta.userAgent });
      throw new UnauthorizedError('Refresh token reuse detected, all sessions revoked');
    }

    const user = await userRepository.findById(decoded.userId);
    if (!user) throw new UnauthorizedError('User not found');

    const newRefreshRaw = signRefreshToken(user.id);
    const newRow = await refreshTokenRepository.create({
      userId: user.id,
      tokenHash: hashToken(newRefreshRaw),
      expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    await refreshTokenRepository.revoke(stored.id, newRow.id);

    const fullUser = await userRepository.findByEmail(user.email);
    const roles = fullUser!.roles.map((r: any) => r.role.name);
    const permissions = flattenPermissions(fullUser);
    const accessToken = signAccessToken({ userId: user.id, email: user.email, roles, permissions });

    return { accessToken, refreshToken: newRefreshRaw };
  },

  async logout(refreshTokenRaw: string) {
    const stored = await refreshTokenRepository.findByHash(hashToken(refreshTokenRaw));
    if (stored && !stored.revokedAt) await refreshTokenRepository.revoke(stored.id);
  },

  async requestPasswordReset(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) return; // no user-enumeration

    const rawToken = crypto.randomBytes(32).toString('base64url');
    await passwordResetTokenRepository.create({
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000),
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[stub email] Password reset link for ${email}: /reset-password?token=${rawToken}`);
    }
  },

  async resetPassword(rawToken: string, newPassword: string) {
    const stored = await passwordResetTokenRepository.findByHash(hashToken(rawToken));
    if (!stored) throw new UnauthorizedError('Invalid or expired reset token');
    if (stored.expiresAt < new Date()) throw new UnauthorizedError('Invalid or expired reset token');
    if (stored.usedAt) throw new UnauthorizedError('Invalid or expired reset token');

    const passwordHash = await hashPassword(newPassword);
    await userRepository.update(stored.userId, { passwordHash });
    await passwordResetTokenRepository.markUsed(stored.id);
    await refreshTokenRepository.revokeAllForUser(stored.userId);
  },
};
