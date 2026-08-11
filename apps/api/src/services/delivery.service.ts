import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, ForbiddenError } from '../lib/errors';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { notificationService } from './notification.service';
import { toSkipTake, paged } from '../lib/pagination';
import { nextReference } from '../lib/reference';
import type { CreateDeliveryInput, UpdateDeliveryStatusInput } from '@inventory/shared';

const detail = {
  assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } },
  request: {
    include: {
      doctor: { select: { id: true, email: true, firstName: true, lastName: true } },
      warehouse: { select: { id: true, name: true, code: true } },
      items: { include: { product: { select: { id: true, sku: true, name: true, unit: true } } } },
    },
  },
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: ['IN_TRANSIT'],
};

export const deliveryService = {
  async list(query: { page?: unknown; pageSize?: unknown; status?: string; assignedToId?: string }) {
    const { page, pageSize, skip, take } = toSkipTake(query);
    const where: Prisma.DeliveryWhereInput = {
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.delivery.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: detail }),
      prisma.delivery.count({ where }),
    ]);
    return paged(items, total, page, pageSize);
  },

  async getById(id: string, viewer: { userId: string; canViewAll: boolean }) {
    const delivery = await prisma.delivery.findUnique({ where: { id }, include: detail });
    if (!delivery) throw new NotFoundError('Delivery not found');
    if (!viewer.canViewAll && delivery.assignedToId !== viewer.userId) {
      throw new ForbiddenError('You can only view deliveries assigned to you');
    }
    return delivery;
  },

  async create(input: CreateDeliveryInput, actorUserId: string) {
    const request = await prisma.request.findUnique({ where: { id: input.requestId }, include: { delivery: true } });
    if (!request) throw new NotFoundError('Request not found');
    if (request.status !== 'APPROVED') {
      throw new ValidationError('Only approved requests can be scheduled for delivery');
    }
    if (request.delivery) throw new ValidationError('This request already has a delivery');

    const driver = await prisma.user.findFirst({ where: { id: input.assignedToId, deletedAt: null } });
    if (!driver) throw new NotFoundError('Delivery staff member not found');

    const delivery = await prisma.delivery.create({
      data: {
        reference: await nextReference('DLV'),
        requestId: input.requestId,
        assignedToId: input.assignedToId,
        note: input.note,
      },
      include: detail,
    });

    await auditLogRepository.create({
      userId: actorUserId,
      action: 'DELIVERY_CREATED',
      entityType: 'Delivery',
      entityId: delivery.id,
      newValue: { reference: delivery.reference } as Prisma.InputJsonValue,
    });

    await notificationService.notifyUser(input.assignedToId, {
      title: `Delivery ${delivery.reference} assigned to you`,
      body: `For request ${request.reference}.`,
      link: '/delivery/deliveries',
    });

    return delivery;
  },

  async updateStatus(id: string, input: UpdateDeliveryStatusInput, actor: { userId: string; canViewAll: boolean }) {
    const delivery = await prisma.delivery.findUnique({ where: { id }, include: { request: true } });
    if (!delivery) throw new NotFoundError('Delivery not found');
    if (!actor.canViewAll && delivery.assignedToId !== actor.userId) {
      throw new ForbiddenError('You can only update deliveries assigned to you');
    }
    if (!ALLOWED_TRANSITIONS[delivery.status].includes(input.status)) {
      throw new ValidationError(`Cannot move a ${delivery.status} delivery to ${input.status}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.delivery.update({
        where: { id },
        data: {
          status: input.status,
          ...(input.note ? { note: input.note } : {}),
          ...(input.status === 'IN_TRANSIT' ? { dispatchedAt: new Date() } : {}),
          ...(input.status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
        },
        include: detail,
      });

      // A completed delivery closes out the originating request.
      if (input.status === 'DELIVERED') {
        await tx.request.update({ where: { id: delivery.requestId }, data: { status: 'FULFILLED' } });
      }

      return result;
    });

    await auditLogRepository.create({
      userId: actor.userId,
      action: `DELIVERY_${input.status}`,
      entityType: 'Delivery',
      entityId: id,
    });

    await notificationService.notifyUser(updated.request.doctorId, {
      title: `Delivery ${updated.reference} is ${input.status.replace('_', ' ').toLowerCase()}`,
      link: '/doctor/requests',
    });

    return updated;
  },

  /** Delivery staff available to be assigned work. */
  async assignableStaff() {
    return prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        roles: { some: { role: { name: 'DELIVERY_STAFF' } } },
      },
      select: { id: true, email: true, firstName: true, lastName: true },
      orderBy: { firstName: 'asc' },
    });
  },
};
