import { z } from 'zod';

const lineItems = z
  .array(
    z.object({
      productId: z.string().min(1),
      quantity: z.coerce.number().int().positive(),
    }),
  )
  .min(1, 'Add at least one item');

export const createRequestSchema = z.object({
  warehouseId: z.string().min(1),
  note: z.string().optional(),
  items: lineItems,
});
export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export const reviewRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().optional(),
});
export type ReviewRequestInput = z.infer<typeof reviewRequestSchema>;

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1),
  warehouseId: z.string().min(1),
  expectedAt: z.coerce.date().optional().nullable(),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
        unitPrice: z.coerce.number().nonnegative(),
      }),
    )
    .min(1, 'Add at least one item'),
});
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

export const updatePurchaseOrderStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'RECEIVED', 'CANCELLED']),
});
export type UpdatePurchaseOrderStatusInput = z.infer<typeof updatePurchaseOrderStatusSchema>;

export const createDeliverySchema = z.object({
  requestId: z.string().min(1),
  assignedToId: z.string().min(1),
  note: z.string().optional(),
});
export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;

export const updateDeliveryStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'FAILED']),
  note: z.string().optional(),
});
export type UpdateDeliveryStatusInput = z.infer<typeof updateDeliveryStatusSchema>;
