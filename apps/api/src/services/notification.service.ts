import { prisma } from '../lib/prisma';
import { toSkipTake, paged } from '../lib/pagination';

interface NotificationInput {
  title: string;
  body?: string;
  link?: string;
}

export const notificationService = {
  async notifyUser(userId: string, input: NotificationInput) {
    return prisma.notification.create({ data: { userId, ...input } });
  },

  /** Fans a notification out to everyone whose roles carry `permissionKey`. */
  async notifyPermission(permissionKey: string, input: NotificationInput) {
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        roles: { some: { role: { permissions: { some: { permission: { key: permissionKey } } } } } },
      },
      select: { id: true },
    });
    if (users.length === 0) return;
    await prisma.notification.createMany({
      data: users.map((u) => ({ userId: u.id, ...input })),
    });
  },

  async list(userId: string, query: { page?: unknown; pageSize?: unknown; unreadOnly?: string }) {
    const { page, pageSize, skip, take } = toSkipTake(query);
    const where = { userId, ...(query.unreadOnly === 'true' ? { readAt: null } : {}) };
    const [items, total, unread] = await Promise.all([
      prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { ...paged(items, total, page, pageSize), unread };
  },

  async markRead(id: string, userId: string) {
    // Scoped by userId so one user can't mark another's notifications.
    await prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
  },

  async markAllRead(userId: string) {
    await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  },
};
