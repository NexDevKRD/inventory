import { prisma } from '../lib/prisma';
import { Prisma, UserStatus } from '@prisma/client';

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findFirst({ where: { email, deletedAt: null }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
  },
  findById(id: string) {
    return prisma.user.findFirst({ where: { id, deletedAt: null }, include: { roles: { include: { role: true } } } });
  },
  create(data: { email: string; passwordHash: string; firstName: string; lastName: string; phone?: string; roleIds: string[] }) {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        roles: { create: data.roleIds.map((roleId) => ({ roleId })) },
      },
      include: { roles: { include: { role: true } } },
    });
  },
  update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  },
  softDelete(id: string) {
    return prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: UserStatus.INACTIVE } });
  },
  list(params: { skip: number; take: number; search?: string }) {
    const where = {
      deletedAt: null,
      ...(params.search
        ? { OR: [{ email: { contains: params.search, mode: 'insensitive' as const } }, { firstName: { contains: params.search, mode: 'insensitive' as const } }, { lastName: { contains: params.search, mode: 'insensitive' as const } }] }
        : {}),
    };
    return Promise.all([
      prisma.user.findMany({ where, skip: params.skip, take: params.take, include: { roles: { include: { role: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);
  },
  incrementFailedLogin(id: string, lockedUntil: Date | null) {
    return prisma.user.update({ where: { id }, data: { failedLoginCount: { increment: 1 }, lockedUntil } });
  },
  resetFailedLogin(id: string) {
    return prisma.user.update({ where: { id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
  },
};
