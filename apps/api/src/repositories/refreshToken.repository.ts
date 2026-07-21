import { prisma } from '../lib/prisma';

export const refreshTokenRepository = {
  create(data: { userId: string; tokenHash: string; expiresAt: Date; ipAddress?: string; userAgent?: string }) {
    return prisma.refreshToken.create({ data });
  },
  findByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },
  revoke(id: string, replacedByTokenId?: string) {
    return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date(), replacedByTokenId } });
  },
  revokeAllForUser(userId: string) {
    return prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  },
};
