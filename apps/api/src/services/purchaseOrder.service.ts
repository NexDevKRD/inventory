import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, ForbiddenError } from '../lib/errors';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { notificationService } from './notification.service';
import { toSkipTake, paged } from '../lib/pagination';
import { nextReference } from '../lib/reference';
import type { CreatePurchaseOrderInput, UpdatePurchaseOrderStatusInput } from '@inventory/shared';

const detail = {
  supplier: { select: { id: true, name: true, contactEmail: true, userId: true } },
  warehouse: { select: { id: true, name: true, code: true } },
  createdBy: { select: { id: true, email: true } },
  items: { include: { product: { select: { id: true, sku: true, name: true, unit: true } } } },
};

// A PO may only move forwards, or be cancelled before it is received.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['APPROVED', 'CANCELLED'],
  APPROVED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: [],
  CANCELLED: [],
};

function withTotal<T extends { items: { quantity: number; unitPrice: Prisma.Decimal }[] }>(po: T) {
  const total = po.items.reduce((sum, i) => sum + i.quantity * Number(i.unitPrice), 0);
  return { ...po, total };
}

export const purchaseOrderService = {
  async list(query: { page?: unknown; pageSize?: unknown; status?: string; supplierId?: string }) {
    const { page, pageSize, skip, take } = toSkipTake(query);
    const where: Prisma.PurchaseOrderWhereInput = {
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.purchaseOrder.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: detail }),
      prisma.purchaseOrder.count({ where }),
    ]);
    return paged(items.map(withTotal), total, page, pageSize);
  },

  async getById(id: string) {
    const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: detail });
    if (!po) throw new NotFoundError('Purchase order not found');
    return withTotal(po);
  },

  /** Resolves the Supplier row linked to a supplier-portal user account. */
  async supplierIdForUser(userId: string) {
    const supplier = await prisma.supplier.findFirst({ where: { userId, deletedAt: null } });
    if (!supplier) throw new ForbiddenError('This account is not linked to a supplier');
    return supplier.id;
  },

  async create(input: CreatePurchaseOrderInput, actorUserId: string) {
    const [supplier, warehouse] = await Promise.all([
      prisma.supplier.findFirst({ where: { id: input.supplierId, deletedAt: null } }),
      prisma.warehouse.findFirst({ where: { id: input.warehouseId, deletedAt: null } }),
    ]);
    if (!supplier) throw new NotFoundError('Supplier not found');
    if (!warehouse) throw new NotFoundError('Warehouse not found');

    const po = await prisma.purchaseOrder.create({
      data: {
        reference: await nextReference('PO'),
        supplierId: input.supplierId,
        warehouseId: input.warehouseId,
        expectedAt: input.expectedAt ?? null,
        note: input.note,
        createdById: actorUserId,
        items: {
          create: input.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: new Prisma.Decimal(i.unitPrice),
          })),
        },
      },
      include: detail,
    });

    await auditLogRepository.create({
      userId: actorUserId,
      action: 'PURCHASE_ORDER_CREATED',
      entityType: 'PurchaseOrder',
      entityId: po.id,
      newValue: { reference: po.reference } as Prisma.InputJsonValue,
    });

    return withTotal(po);
  },

  /**
   * Moves a PO along its lifecycle. Receiving it books the ordered quantities
   * into the destination warehouse and writes the stock movements.
   */
  async updateStatus(id: string, input: UpdatePurchaseOrderStatusInput, actorUserId: string) {
    const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true, supplier: true } });
    if (!po) throw new NotFoundError('Purchase order not found');

    if (!ALLOWED_TRANSITIONS[po.status].includes(input.status)) {
      throw new ValidationError(`Cannot move a ${po.status} order to ${input.status}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (input.status === 'RECEIVED') {
        for (const item of po.items) {
          const existing = await tx.stockItem.findFirst({
            where: { productId: item.productId, warehouseId: po.warehouseId, batchNumber: po.reference },
          });

          if (existing) {
            await tx.stockItem.update({
              where: { id: existing.id },
              data: { quantity: existing.quantity + item.quantity },
            });
          } else {
            await tx.stockItem.create({
              data: {
                productId: item.productId,
                warehouseId: po.warehouseId,
                quantity: item.quantity,
                // Received goods are traceable back to the order that brought them in.
                batchNumber: po.reference,
              },
            });
          }

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              warehouseId: po.warehouseId,
              type: 'IN',
              quantity: item.quantity,
              reason: `Purchase order ${po.reference} received`,
              referenceType: 'PurchaseOrder',
              referenceId: po.id,
              userId: actorUserId,
            },
          });
        }
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          status: input.status,
          ...(input.status === 'RECEIVED' ? { receivedAt: new Date() } : {}),
        },
        include: detail,
      });
    });

    await auditLogRepository.create({
      userId: actorUserId,
      action: `PURCHASE_ORDER_${input.status}`,
      entityType: 'PurchaseOrder',
      entityId: id,
    });

    if (input.status === 'SUBMITTED' && po.supplier.userId) {
      await notificationService.notifyUser(po.supplier.userId, {
        title: `Purchase order ${po.reference} submitted`,
        body: 'A new order is awaiting your fulfilment.',
        link: '/supplier/purchase-orders',
      });
    }

    return withTotal(updated);
  },
};
