import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { NotFoundError, ConflictError } from '../lib/errors';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { toSkipTake, paged } from '../lib/pagination';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateProductInput,
  UpdateProductInput,
  CreateWarehouseInput,
  UpdateWarehouseInput,
  CreateSupplierInput,
  UpdateSupplierInput,
} from '@inventory/shared';

const alive = { deletedAt: null };

async function audit(actorUserId: string, action: string, entityType: string, entityId: string, newValue?: unknown) {
  await auditLogRepository.create({
    userId: actorUserId,
    action,
    entityType,
    entityId,
    newValue: newValue as Prisma.InputJsonValue,
  });
}

export const categoryService = {
  async list() {
    return prisma.category.findMany({
      where: alive,
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  },

  async create(input: CreateCategoryInput, actorUserId: string) {
    const existing = await prisma.category.findFirst({ where: { name: input.name } });
    if (existing) throw new ConflictError('A category with that name already exists');
    const category = await prisma.category.create({ data: input });
    await audit(actorUserId, 'CATEGORY_CREATED', 'Category', category.id, input);
    return category;
  },

  async update(id: string, input: UpdateCategoryInput, actorUserId: string) {
    const existing = await prisma.category.findFirst({ where: { id, ...alive } });
    if (!existing) throw new NotFoundError('Category not found');
    const category = await prisma.category.update({ where: { id }, data: input });
    await audit(actorUserId, 'CATEGORY_UPDATED', 'Category', id, input);
    return category;
  },

  async remove(id: string, actorUserId: string) {
    const existing = await prisma.category.findFirst({
      where: { id, ...alive },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) throw new NotFoundError('Category not found');
    if (existing._count.products > 0) {
      throw new ConflictError('Move or remove its products before deleting this category');
    }
    await prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit(actorUserId, 'CATEGORY_DELETED', 'Category', id);
  },
};

export const supplierService = {
  async list() {
    return prisma.supplier.findMany({
      where: alive,
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true, purchaseOrders: true } } },
    });
  },

  async create(input: CreateSupplierInput, actorUserId: string) {
    const existing = await prisma.supplier.findFirst({ where: { name: input.name } });
    if (existing) throw new ConflictError('A supplier with that name already exists');
    const supplier = await prisma.supplier.create({
      data: { ...input, contactEmail: input.contactEmail || null, userId: input.userId || null },
    });
    await audit(actorUserId, 'SUPPLIER_CREATED', 'Supplier', supplier.id, input);
    return supplier;
  },

  async update(id: string, input: UpdateSupplierInput, actorUserId: string) {
    const existing = await prisma.supplier.findFirst({ where: { id, ...alive } });
    if (!existing) throw new NotFoundError('Supplier not found');
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { ...input, ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail || null } : {}) },
    });
    await audit(actorUserId, 'SUPPLIER_UPDATED', 'Supplier', id, input);
    return supplier;
  },

  async remove(id: string, actorUserId: string) {
    const existing = await prisma.supplier.findFirst({ where: { id, ...alive } });
    if (!existing) throw new NotFoundError('Supplier not found');
    await prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit(actorUserId, 'SUPPLIER_DELETED', 'Supplier', id);
  },
};

export const warehouseService = {
  async list() {
    return prisma.warehouse.findMany({
      where: alive,
      orderBy: { name: 'asc' },
      include: { _count: { select: { stockItems: true } } },
    });
  },

  async create(input: CreateWarehouseInput, actorUserId: string) {
    const existing = await prisma.warehouse.findFirst({ where: { code: input.code } });
    if (existing) throw new ConflictError('A warehouse with that code already exists');
    const warehouse = await prisma.warehouse.create({ data: input });
    await audit(actorUserId, 'WAREHOUSE_CREATED', 'Warehouse', warehouse.id, input);
    return warehouse;
  },

  async update(id: string, input: UpdateWarehouseInput, actorUserId: string) {
    const existing = await prisma.warehouse.findFirst({ where: { id, ...alive } });
    if (!existing) throw new NotFoundError('Warehouse not found');
    const warehouse = await prisma.warehouse.update({ where: { id }, data: input });
    await audit(actorUserId, 'WAREHOUSE_UPDATED', 'Warehouse', id, input);
    return warehouse;
  },

  async remove(id: string, actorUserId: string) {
    const existing = await prisma.warehouse.findFirst({ where: { id, ...alive } });
    if (!existing) throw new NotFoundError('Warehouse not found');
    const stock = await prisma.stockItem.aggregate({ where: { warehouseId: id }, _sum: { quantity: true } });
    if ((stock._sum.quantity ?? 0) > 0) {
      throw new ConflictError('This warehouse still holds stock and cannot be deleted');
    }
    await prisma.warehouse.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit(actorUserId, 'WAREHOUSE_DELETED', 'Warehouse', id);
  },
};

export const productService = {
  async list(query: { page?: unknown; pageSize?: unknown; search?: string; categoryId?: string; status?: string }) {
    const { page, pageSize, skip, take } = toSkipTake(query);
    const where: Prisma.ProductWhereInput = {
      ...alive,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { sku: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          stockItems: { select: { quantity: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Total on-hand across warehouses is what every list view wants to show.
    const withStock = items.map(({ stockItems, ...product }) => ({
      ...product,
      totalStock: stockItems.reduce((sum, s) => sum + s.quantity, 0),
    }));

    return paged(withStock, total, page, pageSize);
  },

  async getById(id: string) {
    const product = await prisma.product.findFirst({
      where: { id, ...alive },
      include: {
        category: true,
        supplier: true,
        stockItems: { include: { warehouse: { select: { id: true, name: true, code: true } } } },
      },
    });
    if (!product) throw new NotFoundError('Product not found');
    return product;
  },

  async create(input: CreateProductInput, actorUserId: string) {
    const existing = await prisma.product.findFirst({ where: { sku: input.sku } });
    if (existing) throw new ConflictError('A product with that SKU already exists');
    const product = await prisma.product.create({
      data: { ...input, supplierId: input.supplierId || null },
    });
    await audit(actorUserId, 'PRODUCT_CREATED', 'Product', product.id, input);
    return product;
  },

  async update(id: string, input: UpdateProductInput, actorUserId: string) {
    const existing = await prisma.product.findFirst({ where: { id, ...alive } });
    if (!existing) throw new NotFoundError('Product not found');
    const product = await prisma.product.update({
      where: { id },
      data: { ...input, ...(input.supplierId !== undefined ? { supplierId: input.supplierId || null } : {}) },
    });
    await audit(actorUserId, 'PRODUCT_UPDATED', 'Product', id, input);
    return product;
  },

  async remove(id: string, actorUserId: string) {
    const existing = await prisma.product.findFirst({ where: { id, ...alive } });
    if (!existing) throw new NotFoundError('Product not found');
    await prisma.product.update({ where: { id }, data: { deletedAt: new Date(), status: 'INACTIVE' } });
    await audit(actorUserId, 'PRODUCT_DELETED', 'Product', id);
  },
};
