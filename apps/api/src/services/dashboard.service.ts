import { prisma } from '../lib/prisma';
import { stockService } from './stock.service';

export const dashboardService = {
  /** Counters and lists for the inventory/admin dashboards. */
  async overview() {
    const [
      productCount,
      warehouseCount,
      supplierCount,
      userCount,
      pendingRequests,
      openPurchaseOrders,
      activeDeliveries,
      stockTotals,
      lowStock,
      expiring,
      recentMovements,
    ] = await Promise.all([
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.warehouse.count({ where: { deletedAt: null } }),
      prisma.supplier.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.request.count({ where: { status: 'PENDING' } }),
      prisma.purchaseOrder.count({ where: { status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED'] } } }),
      prisma.delivery.count({ where: { status: { in: ['PENDING', 'IN_TRANSIT'] } } }),
      prisma.stockItem.aggregate({ _sum: { quantity: true } }),
      stockService.lowStock(5),
      stockService.expiring(90, 5),
      prisma.stockMovement.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          warehouse: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      counts: {
        products: productCount,
        warehouses: warehouseCount,
        suppliers: supplierCount,
        users: userCount,
        pendingRequests,
        openPurchaseOrders,
        activeDeliveries,
        totalStock: stockTotals._sum.quantity ?? 0,
        lowStock: lowStock.length,
      },
      lowStock,
      expiring,
      recentMovements,
    };
  },

  async forDoctor(doctorId: string) {
    const [pending, approved, fulfilled, recent, favourites] = await Promise.all([
      prisma.request.count({ where: { doctorId, status: 'PENDING' } }),
      prisma.request.count({ where: { doctorId, status: 'APPROVED' } }),
      prisma.request.count({ where: { doctorId, status: 'FULFILLED' } }),
      prisma.request.findMany({
        where: { doctorId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: { select: { name: true } },
          items: { include: { product: { select: { name: true, unit: true } } } },
        },
      }),
      prisma.favourite.count({ where: { userId: doctorId } }),
    ]);

    return { counts: { pending, approved, fulfilled, favourites }, recent };
  },

  async forDriver(userId: string) {
    const [pending, inTransit, deliveredToday, next] = await Promise.all([
      prisma.delivery.count({ where: { assignedToId: userId, status: 'PENDING' } }),
      prisma.delivery.count({ where: { assignedToId: userId, status: 'IN_TRANSIT' } }),
      prisma.delivery.count({
        where: {
          assignedToId: userId,
          status: 'DELIVERED',
          deliveredAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.delivery.findMany({
        where: { assignedToId: userId, status: { in: ['PENDING', 'IN_TRANSIT'] } },
        take: 5,
        orderBy: { createdAt: 'asc' },
        include: {
          request: {
            include: {
              warehouse: { select: { name: true } },
              doctor: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);

    return { counts: { pending, inTransit, deliveredToday }, next };
  },

  async forSupplier(supplierId: string) {
    const [submitted, approved, received, recent] = await Promise.all([
      prisma.purchaseOrder.count({ where: { supplierId, status: 'SUBMITTED' } }),
      prisma.purchaseOrder.count({ where: { supplierId, status: 'APPROVED' } }),
      prisma.purchaseOrder.count({ where: { supplierId, status: 'RECEIVED' } }),
      prisma.purchaseOrder.findMany({
        where: { supplierId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: { select: { name: true } },
          items: { include: { product: { select: { name: true } } } },
        },
      }),
    ]);

    return { counts: { submitted, approved, received }, recent };
  },

  /** Aggregates for the reports page. */
  async reports() {
    const [byCategory, byWarehouse, requestsByStatus, topMoved] = await Promise.all([
      prisma.product.groupBy({ by: ['categoryId'], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.stockItem.groupBy({ by: ['warehouseId'], _sum: { quantity: true } }),
      prisma.request.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.stockMovement.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    const [categories, warehouses, products] = await Promise.all([
      prisma.category.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
      prisma.warehouse.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
      prisma.product.findMany({
        where: { id: { in: topMoved.map((t) => t.productId) } },
        select: { id: true, name: true, sku: true },
      }),
    ]);

    const nameOf = <T extends { id: string; name: string }>(rows: T[], id: string) =>
      rows.find((r) => r.id === id)?.name ?? 'Unknown';

    return {
      productsByCategory: byCategory.map((row) => ({
        label: nameOf(categories, row.categoryId),
        value: row._count._all,
      })),
      stockByWarehouse: byWarehouse.map((row) => ({
        label: nameOf(warehouses, row.warehouseId),
        value: row._sum.quantity ?? 0,
      })),
      requestsByStatus: requestsByStatus.map((row) => ({ label: row.status, value: row._count._all })),
      topMovedProducts: topMoved.map((row) => ({
        label: products.find((p) => p.id === row.productId)?.name ?? 'Unknown',
        value: Math.abs(row._sum.quantity ?? 0),
      })),
    };
  },
};
