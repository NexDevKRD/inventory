import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const createProductSchema = z.object({
  sku: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  categoryId: z.string().min(1),
  supplierId: z.string().optional().nullable(),
  unit: z.string().min(1),
  unitPrice: z.coerce.number().nonnegative(),
  reorderLevel: z.coerce.number().int().nonnegative(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial().omit({ sku: true });
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const createWarehouseSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  location: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;

export const updateWarehouseSchema = createWarehouseSchema.partial().omit({ code: true });
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;

export const createSupplierSchema = z.object({
  name: z.string().min(2),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  userId: z.string().optional().nullable(),
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.partial();
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const adjustStockSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  // Signed delta: positive receives stock, negative issues it.
  quantity: z.coerce.number().int().refine((n) => n !== 0, 'Quantity cannot be zero'),
  batchNumber: z.string().optional(),
  expiryDate: z.coerce.date().optional().nullable(),
  reason: z.string().min(2),
});
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
