import { prisma } from '../lib/prisma';

export const auditLogRepository = {
  create(data: { userId?: string; action: string; entityType?: string; entityId?: string; oldValue?: unknown; newValue?: unknown; ipAddress?: string; userAgent?: string }) {
    return prisma.auditLog.create({ data: data as any });
  },
  list(params: { skip: number; take: number; userId?: string; action?: string }) {
    const where = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.action ? { action: params.action } : {}),
    };
    return Promise.all([
      prisma.auditLog.findMany({ where, skip: params.skip, take: params.take, orderBy: { createdAt: 'desc' }, include: { user: true } }),
      prisma.auditLog.count({ where }),
    ]);
  },
};
