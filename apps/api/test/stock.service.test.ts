import { stockService } from '../src/services/stock.service';
import { prisma } from '../src/lib/prisma';
import { ValidationError } from '../src/lib/errors';

describe('stockService', () => {
  let productId: string;
  let warehouseId: string;
  let categoryId: string;
  let actorUserId: string;

  beforeAll(async () => {
    const category = await prisma.category.upsert({
      where: { name: 'Test Category' },
      update: {},
      create: { name: 'Test Category' },
    });
    categoryId = category.id;

    const product = await prisma.product.upsert({
      where: { sku: 'TEST-STOCK-1' },
      update: {},
      create: { sku: 'TEST-STOCK-1', name: 'Test Item', unit: 'box', unitPrice: 5, reorderLevel: 10, categoryId },
    });
    productId = product.id;

    const warehouse = await prisma.warehouse.upsert({
      where: { code: 'TEST-WH' },
      update: {},
      create: { code: 'TEST-WH', name: 'Test Warehouse' },
    });
    warehouseId = warehouse.id;

    const actor = await prisma.user.upsert({
      where: { email: 'stock.actor@example.com' },
      update: {},
      create: { email: 'stock.actor@example.com', passwordHash: 'x', firstName: 'Stock', lastName: 'Actor' },
    });
    actorUserId = actor.id;

    await prisma.stockItem.deleteMany({ where: { productId, warehouseId } });
    await prisma.stockMovement.deleteMany({ where: { productId } });
  });

  afterAll(async () => {
    await prisma.stockMovement.deleteMany({ where: { productId } });
    await prisma.stockItem.deleteMany({ where: { productId } });
    await prisma.product.delete({ where: { id: productId } }).catch(() => {});
    await prisma.warehouse.delete({ where: { id: warehouseId } }).catch(() => {});
    await prisma.category.delete({ where: { id: categoryId } }).catch(() => {});
    await prisma.auditLog.deleteMany({ where: { userId: actorUserId } });
    await prisma.user.delete({ where: { id: actorUserId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it('creates the stock line on first receipt and records a movement', async () => {
    const item = await stockService.adjust(
      { productId, warehouseId, quantity: 25, reason: 'initial receipt' },
      actorUserId,
    );
    expect(item.quantity).toBe(25);

    const movements = await prisma.stockMovement.findMany({ where: { productId } });
    expect(movements).toHaveLength(1);
    expect(movements[0].type).toBe('IN');
  });

  it('applies a negative delta as an issue', async () => {
    const item = await stockService.adjust(
      { productId, warehouseId, quantity: -10, reason: 'issued to ward' },
      actorUserId,
    );
    expect(item.quantity).toBe(15);
  });

  it('refuses to take a stock level below zero', async () => {
    await expect(
      stockService.adjust({ productId, warehouseId, quantity: -999, reason: 'oversell' }, actorUserId),
    ).rejects.toBeInstanceOf(ValidationError);

    const item = await prisma.stockItem.findFirst({ where: { productId, warehouseId } });
    expect(item!.quantity).toBe(15);
  });

  it('flags products at or below their reorder level', async () => {
    const low = await stockService.lowStock(50);
    expect(low.find((p) => p.id === productId)).toBeUndefined();

    await stockService.adjust({ productId, warehouseId, quantity: -10, reason: 'drain' }, actorUserId);
    const lowAfter = await stockService.lowStock(50);
    expect(lowAfter.find((p) => p.id === productId)?.totalStock).toBe(5);
  });
});
