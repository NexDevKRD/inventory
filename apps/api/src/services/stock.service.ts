import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../lib/errors';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { toSkipTake, paged } from '../lib/pagination';
import type { AdjustStockInput } from '@inventory/shared';

export const stockService = {
  async list(query: { page?: unknown; pageSize?: unknown; warehouseId?: string; search?: string; lowOnly?: string }) {
    const { page, pageSize, skip, take } = toSkipTake(query);
    const where: Prisma.StockItemWhereInput = {
      product: {
        deletedAt: null,
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' as const } },
                { sku: { contains: query.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.stockItem.findMany({
        where,
        skip,
        take,
        orderBy: [{ quantity: 'asc' }, { expiryDate: 'asc' }],
        include: {
          product: { select: { id: true, sku: true, name: true, unit: true, reorderLevel: true } },
          warehouse: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.stockItem.count({ where }),
    ]);

    const rows = items.map((item) => ({
      ...item,
      isLow: item.quantity <= item.product.reorderLevel,
    }));

    return paged(query.lowOnly === 'true' ? rows.filter((r) => r.isLow) : rows, total, page, pageSize);
  },

  /**
   * Applies a signed quantity delta to one product/warehouse/batch and records a
   * movement. Runs in a transaction so the ledger can never disagree with the level.
   */
  async adjust(input: AdjustStockInput, actorUserId: string) {
    const [product, warehouse] = await Promise.all([
      prisma.product.findFirst({ where: { id: input.productId, deletedAt: null } }),
      prisma.warehouse.findFirst({ where: { id: input.warehouseId, deletedAt: null } }),
    ]);
    if (!product) throw new NotFoundError('Product not found');
    if (!warehouse) throw new NotFoundError('Warehouse not found');

    return prisma.$transaction(async (tx) => {
      // batchNumber is nullable, so findFirst rather than a compound-unique lookup.
      const existing = await tx.stockItem.findFirst({
        where: {
          productId: input.productId,
          warehouseId: input.warehouseId,
          batchNumber: input.batchNumber ?? null,
        },
      });

      const nextQuantity = (existing?.quantity ?? 0) + input.quantity;
      if (nextQuantity < 0) {
        throw new ValidationError(
          `Only ${existing?.quantity ?? 0} in stock — cannot remove ${Math.abs(input.quantity)}`,
        );
      }

      const stockItem = existing
        ? await tx.stockItem.update({
            where: { id: existing.id },
            data: {
              quantity: nextQuantity,
              ...(input.expiryDate !== undefined ? { expiryDate: input.expiryDate } : {}),
            },
          })
        : await tx.stockItem.create({
            data: {
              productId: input.productId,
              warehouseId: input.warehouseId,
              quantity: nextQuantity,
              batchNumber: input.batchNumber ?? null,
              expiryDate: input.expiryDate ?? null,
            },
          });

      await tx.stockMovement.create({
        data: {
          productId: input.productId,
          warehouseId: input.warehouseId,
          type: input.quantity > 0 ? 'IN' : 'OUT',
          quantity: input.quantity,
          reason: input.reason,
          userId: actorUserId,
        },
      });

      return stockItem;
    });
  },

  async movements(query: { page?: unknown; pageSize?: unknown; productId?: string; warehouseId?: string }) {
    const { page, pageSize, skip, take } = toSkipTake(query);
    const where: Prisma.StockMovementWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, sku: true, name: true } },
          warehouse: { select: { id: true, name: true } },
          user: { select: { id: true, email: true } },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return paged(items, total, page, pageSize);
  },

  /** Products at or below their reorder level, aggregated across warehouses. */
  async lowStock(limit = 20) {
    const products = await prisma.product.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      include: { stockItems: { select: { quantity: true } }, category: { select: { name: true } } },
    });

    return products
      .map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        category: p.category.name,
        reorderLevel: p.reorderLevel,
        totalStock: p.stockItems.reduce((sum, s) => sum + s.quantity, 0),
      }))
      .filter((p) => p.totalStock <= p.reorderLevel)
      .sort((a, b) => a.totalStock - b.totalStock)
      .slice(0, limit);
  },

  /** Batches expiring within `days`, soonest first. */
  async expiring(days = 90, limit = 20) {
    const cutoff = new Date(Date.now() + days * 86_400_000);
    const items = await prisma.stockItem.findMany({
      where: { expiryDate: { not: null, lte: cutoff }, quantity: { gt: 0 } },
      orderBy: { expiryDate: 'asc' },
      take: limit,
      include: {
        product: { select: { id: true, sku: true, name: true, unit: true } },
        warehouse: { select: { id: true, name: true } },
      },
    });
    return items;
  },

  async recordAudit(actorUserId: string, input: AdjustStockInput) {
    await auditLogRepository.create({
      userId: actorUserId,
      action: 'STOCK_ADJUSTED',
      entityType: 'Product',
      entityId: input.productId,
      newValue: input as unknown as Prisma.InputJsonValue,
    });
  },
};
