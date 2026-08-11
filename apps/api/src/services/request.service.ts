import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, ForbiddenError } from '../lib/errors';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { notificationService } from './notification.service';
import { toSkipTake, paged } from '../lib/pagination';
import { nextReference } from '../lib/reference';
import type { CreateRequestInput, ReviewRequestInput } from '@inventory/shared';

const detail = {
  doctor: { select: { id: true, email: true, firstName: true, lastName: true } },
  reviewedBy: { select: { id: true, email: true } },
  warehouse: { select: { id: true, name: true, code: true } },
  items: { include: { product: { select: { id: true, sku: true, name: true, unit: true } } } },
  delivery: { include: { assignedTo: { select: { id: true, email: true } } } },
};

export const requestService = {
  async list(query: {
    page?: unknown;
    pageSize?: unknown;
    status?: string;
    // When set, only this doctor's own requests are returned.
    doctorId?: string;
  }) {
    const { page, pageSize, skip, take } = toSkipTake(query);
    const where: Prisma.RequestWhereInput = {
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.doctorId ? { doctorId: query.doctorId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.request.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: detail }),
      prisma.request.count({ where }),
    ]);
    return paged(items, total, page, pageSize);
  },

  async getById(id: string, viewer: { userId: string; canViewAll: boolean }) {
    const request = await prisma.request.findUnique({ where: { id }, include: detail });
    if (!request) throw new NotFoundError('Request not found');
    if (!viewer.canViewAll && request.doctorId !== viewer.userId) {
      throw new ForbiddenError('You can only view your own requests');
    }
    return request;
  },

  async create(input: CreateRequestInput, doctorId: string) {
    const warehouse = await prisma.warehouse.findFirst({ where: { id: input.warehouseId, deletedAt: null } });
    if (!warehouse) throw new NotFoundError('Warehouse not found');

    const productIds = input.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, deletedAt: null } });
    if (products.length !== new Set(productIds).size) {
      throw new ValidationError('One or more products in this request no longer exist');
    }

    const request = await prisma.request.create({
      data: {
        reference: await nextReference('REQ'),
        doctorId,
        warehouseId: input.warehouseId,
        note: input.note,
        items: { create: input.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) },
      },
      include: detail,
    });

    await auditLogRepository.create({
      userId: doctorId,
      action: 'REQUEST_CREATED',
      entityType: 'Request',
      entityId: request.id,
      newValue: { reference: request.reference, items: input.items } as Prisma.InputJsonValue,
    });

    await notificationService.notifyPermission('request.review', {
      title: `New request ${request.reference}`,
      body: `${request.items.length} item(s) requested for ${warehouse.name}.`,
      link: '/inventory/requests',
    });

    return request;
  },

  /**
   * Approving deducts the approved quantities from the request's warehouse and
   * writes the matching stock movements, all inside one transaction.
   */
  async review(id: string, input: ReviewRequestInput, reviewerId: string) {
    const request = await prisma.request.findUnique({ where: { id }, include: { items: true } });
    if (!request) throw new NotFoundError('Request not found');
    if (request.status !== 'PENDING') {
      throw new ValidationError(`This request has already been ${request.status.toLowerCase()}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (input.status === 'APPROVED') {
        for (const item of request.items) {
          const batches = await tx.stockItem.findMany({
            where: { productId: item.productId, warehouseId: request.warehouseId, quantity: { gt: 0 } },
            // Consume the batch that expires soonest first.
            orderBy: [{ expiryDate: 'asc' }, { updatedAt: 'asc' }],
          });

          const available = batches.reduce((sum, b) => sum + b.quantity, 0);
          if (available < item.quantity) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            throw new ValidationError(
              `Not enough stock for ${product?.name ?? 'product'}: ${available} available, ${item.quantity} requested`,
            );
          }

          let remaining = item.quantity;
          for (const batch of batches) {
            if (remaining === 0) break;
            const takeQty = Math.min(batch.quantity, remaining);
            await tx.stockItem.update({
              where: { id: batch.id },
              data: { quantity: batch.quantity - takeQty },
            });
            remaining -= takeQty;
          }

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              warehouseId: request.warehouseId,
              type: 'OUT',
              quantity: -item.quantity,
              reason: `Request ${request.reference} approved`,
              referenceType: 'Request',
              referenceId: request.id,
              userId: reviewerId,
            },
          });

          await tx.requestItem.update({
            where: { id: item.id },
            data: { approvedQuantity: item.quantity },
          });
        }
      }

      return tx.request.update({
        where: { id },
        data: {
          status: input.status,
          reviewNote: input.reviewNote,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
        include: detail,
      });
    });

    await auditLogRepository.create({
      userId: reviewerId,
      action: `REQUEST_${input.status}`,
      entityType: 'Request',
      entityId: id,
      newValue: { reviewNote: input.reviewNote } as Prisma.InputJsonValue,
    });

    await notificationService.notifyUser(request.doctorId, {
      title: `Request ${updated.reference} ${input.status.toLowerCase()}`,
      body: input.reviewNote ?? undefined,
      link: '/doctor/requests',
    });

    return updated;
  },
};
