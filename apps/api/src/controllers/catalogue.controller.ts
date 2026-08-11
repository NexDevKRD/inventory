import { RequestHandler } from 'express';
import { categoryService, supplierService, warehouseService, productService } from '../services/catalogue.service';

const ok = (res: any, data: unknown, status = 200) => res.status(status).json({ success: true, data });

/** Wraps a handler so every controller doesn't repeat the same try/catch. */
const handler =
  (fn: (req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1]) => Promise<unknown>): RequestHandler =>
  async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err) {
      next(err);
    }
  };

export const listCategories = handler(async (_req, res) => ok(res, await categoryService.list()));
export const createCategory = handler(async (req, res) =>
  ok(res, await categoryService.create(req.body, req.user!.userId), 201),
);
export const updateCategory = handler(async (req, res) =>
  ok(res, await categoryService.update(req.params.id, req.body, req.user!.userId)),
);
export const deleteCategory = handler(async (req, res) => {
  await categoryService.remove(req.params.id, req.user!.userId);
  return ok(res, null);
});

export const listSuppliers = handler(async (_req, res) => ok(res, await supplierService.list()));
export const createSupplier = handler(async (req, res) =>
  ok(res, await supplierService.create(req.body, req.user!.userId), 201),
);
export const updateSupplier = handler(async (req, res) =>
  ok(res, await supplierService.update(req.params.id, req.body, req.user!.userId)),
);
export const deleteSupplier = handler(async (req, res) => {
  await supplierService.remove(req.params.id, req.user!.userId);
  return ok(res, null);
});

export const listWarehouses = handler(async (_req, res) => ok(res, await warehouseService.list()));
export const createWarehouse = handler(async (req, res) =>
  ok(res, await warehouseService.create(req.body, req.user!.userId), 201),
);
export const updateWarehouse = handler(async (req, res) =>
  ok(res, await warehouseService.update(req.params.id, req.body, req.user!.userId)),
);
export const deleteWarehouse = handler(async (req, res) => {
  await warehouseService.remove(req.params.id, req.user!.userId);
  return ok(res, null);
});

export const listProducts = handler(async (req, res) =>
  ok(
    res,
    await productService.list({
      page: req.query.page,
      pageSize: req.query.pageSize,
      search: req.query.search as string | undefined,
      categoryId: req.query.categoryId as string | undefined,
      status: req.query.status as string | undefined,
    }),
  ),
);
export const getProduct = handler(async (req, res) => ok(res, await productService.getById(req.params.id)));
export const createProduct = handler(async (req, res) =>
  ok(res, await productService.create(req.body, req.user!.userId), 201),
);
export const updateProduct = handler(async (req, res) =>
  ok(res, await productService.update(req.params.id, req.body, req.user!.userId)),
);
export const deleteProduct = handler(async (req, res) => {
  await productService.remove(req.params.id, req.user!.userId);
  return ok(res, null);
});
