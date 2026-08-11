import { requestService } from '../src/services/request.service';
import { purchaseOrderService } from '../src/services/purchaseOrder.service';
import { prisma } from '../src/lib/prisma';
import { ValidationError } from '../src/lib/errors';

describe('request and purchase order workflows', () => {
  let productId: string;
  let warehouseId: string;
  let categoryId: string;
  let supplierId: string;
  let doctorId: string;
  let reviewerId: string;

  beforeAll(async () => {
    const category = await prisma.category.upsert({
      where: { name: 'Flow Category' },
      update: {},
      create: { name: 'Flow Category' },
    });
    categoryId = category.id;

    const product = await prisma.product.upsert({
      where: { sku: 'TEST-FLOW-1' },
      update: {},
      create: { sku: 'TEST-FLOW-1', name: 'Flow Item', unit: 'box', unitPrice: 3, reorderLevel: 2, categoryId },
    });
    productId = product.id;

    const warehouse = await prisma.warehouse.upsert({
      where: { code: 'FLOW-WH' },
      update: {},
      create: { code: 'FLOW-WH', name: 'Flow Warehouse' },
    });
    warehouseId = warehouse.id;

    const supplier = await prisma.supplier.upsert({
      where: { name: 'Flow Supplier' },
      update: {},
      create: { name: 'Flow Supplier' },
    });
    supplierId = supplier.id;

    const doctor = await prisma.user.upsert({
      where: { email: 'flow.doctor@example.com' },
      update: {},
      create: { email: 'flow.doctor@example.com', passwordHash: 'x', firstName: 'Flow', lastName: 'Doctor' },
    });
    doctorId = doctor.id;

    const reviewer = await prisma.user.upsert({
      where: { email: 'flow.reviewer@example.com' },
      update: {},
      create: { email: 'flow.reviewer@example.com', passwordHash: 'x', firstName: 'Flow', lastName: 'Reviewer' },
    });
    reviewerId = reviewer.id;

    await prisma.stockItem.deleteMany({ where: { productId } });
    await prisma.stockMovement.deleteMany({ where: { productId } });
    await prisma.stockItem.create({ data: { productId, warehouseId, quantity: 10, batchNumber: 'FLOW-B1' } });
  });

  afterAll(async () => {
    await prisma.requestItem.deleteMany({ where: { productId } });
    await prisma.request.deleteMany({ where: { doctorId } });
    await prisma.purchaseOrderItem.deleteMany({ where: { productId } });
    await prisma.purchaseOrder.deleteMany({ where: { supplierId } });
    await prisma.stockMovement.deleteMany({ where: { productId } });
    await prisma.stockItem.deleteMany({ where: { productId } });
    await prisma.notification.deleteMany({ where: { userId: { in: [doctorId, reviewerId] } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: [doctorId, reviewerId] } } });
    await prisma.product.delete({ where: { id: productId } }).catch(() => {});
    await prisma.warehouse.delete({ where: { id: warehouseId } }).catch(() => {});
    await prisma.supplier.delete({ where: { id: supplierId } }).catch(() => {});
    await prisma.category.delete({ where: { id: categoryId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [doctorId, reviewerId] } } });
    await prisma.$disconnect();
  });

  it('approving a request deducts the stock it releases', async () => {
    const request = await requestService.create(
      { warehouseId, items: [{ productId, quantity: 4 }] },
      doctorId,
    );
    expect(request.status).toBe('PENDING');

    await requestService.review(request.id, { status: 'APPROVED' }, reviewerId);

    const stock = await prisma.stockItem.findFirst({ where: { productId, warehouseId } });
    expect(stock!.quantity).toBe(6);
  });

  it('refuses to approve a request the warehouse cannot cover', async () => {
    const request = await requestService.create(
      { warehouseId, items: [{ productId, quantity: 999 }] },
      doctorId,
    );

    await expect(
      requestService.review(request.id, { status: 'APPROVED' }, reviewerId),
    ).rejects.toBeInstanceOf(ValidationError);

    // The rejected transaction must leave the level untouched.
    const stock = await prisma.stockItem.findFirst({ where: { productId, warehouseId } });
    expect(stock!.quantity).toBe(6);
  });

  it('rejecting a request leaves stock alone', async () => {
    const request = await requestService.create({ warehouseId, items: [{ productId, quantity: 2 }] }, doctorId);
    const reviewed = await requestService.review(request.id, { status: 'REJECTED' }, reviewerId);

    expect(reviewed.status).toBe('REJECTED');
    const stock = await prisma.stockItem.findFirst({ where: { productId, warehouseId } });
    expect(stock!.quantity).toBe(6);
  });

  it('receiving a purchase order books its quantities into the warehouse', async () => {
    const po = await purchaseOrderService.create(
      { supplierId, warehouseId, items: [{ productId, quantity: 20, unitPrice: 3 }] },
      reviewerId,
    );

    await purchaseOrderService.updateStatus(po.id, { status: 'SUBMITTED' }, reviewerId);
    await purchaseOrderService.updateStatus(po.id, { status: 'APPROVED' }, reviewerId);
    await purchaseOrderService.updateStatus(po.id, { status: 'RECEIVED' }, reviewerId);

    const total = await prisma.stockItem.aggregate({
      where: { productId, warehouseId },
      _sum: { quantity: true },
    });
    expect(total._sum.quantity).toBe(26);
  });

  it('rejects an illegal status transition', async () => {
    const po = await purchaseOrderService.create(
      { supplierId, warehouseId, items: [{ productId, quantity: 1, unitPrice: 1 }] },
      reviewerId,
    );

    await expect(
      purchaseOrderService.updateStatus(po.id, { status: 'RECEIVED' }, reviewerId),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
