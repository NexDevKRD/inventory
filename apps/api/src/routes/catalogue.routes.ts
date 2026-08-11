import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  PermissionKey,
  createCategorySchema,
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
  createWarehouseSchema,
  updateWarehouseSchema,
  createSupplierSchema,
  updateSupplierSchema,
} from '@inventory/shared';
import * as ctrl from '../controllers/catalogue.controller';

export const categoryRouter = Router();
categoryRouter.use(authenticate);
categoryRouter.get('/', authorize(PermissionKey.CATEGORY_VIEW), ctrl.listCategories);
categoryRouter.post('/', authorize(PermissionKey.CATEGORY_MANAGE), validate(createCategorySchema), ctrl.createCategory);
categoryRouter.patch('/:id', authorize(PermissionKey.CATEGORY_MANAGE), validate(updateCategorySchema), ctrl.updateCategory);
categoryRouter.delete('/:id', authorize(PermissionKey.CATEGORY_MANAGE), ctrl.deleteCategory);

export const supplierRouter = Router();
supplierRouter.use(authenticate);
supplierRouter.get('/', authorize(PermissionKey.SUPPLIER_VIEW), ctrl.listSuppliers);
supplierRouter.post('/', authorize(PermissionKey.SUPPLIER_MANAGE), validate(createSupplierSchema), ctrl.createSupplier);
supplierRouter.patch('/:id', authorize(PermissionKey.SUPPLIER_MANAGE), validate(updateSupplierSchema), ctrl.updateSupplier);
supplierRouter.delete('/:id', authorize(PermissionKey.SUPPLIER_MANAGE), ctrl.deleteSupplier);

export const warehouseRouter = Router();
warehouseRouter.use(authenticate);
warehouseRouter.get('/', authorize(PermissionKey.WAREHOUSE_VIEW), ctrl.listWarehouses);
warehouseRouter.post('/', authorize(PermissionKey.WAREHOUSE_MANAGE), validate(createWarehouseSchema), ctrl.createWarehouse);
warehouseRouter.patch('/:id', authorize(PermissionKey.WAREHOUSE_MANAGE), validate(updateWarehouseSchema), ctrl.updateWarehouse);
warehouseRouter.delete('/:id', authorize(PermissionKey.WAREHOUSE_MANAGE), ctrl.deleteWarehouse);

export const productRouter = Router();
productRouter.use(authenticate);
productRouter.get('/', authorize(PermissionKey.PRODUCT_VIEW), ctrl.listProducts);
productRouter.get('/:id', authorize(PermissionKey.PRODUCT_VIEW), ctrl.getProduct);
productRouter.post('/', authorize(PermissionKey.PRODUCT_CREATE), validate(createProductSchema), ctrl.createProduct);
productRouter.patch('/:id', authorize(PermissionKey.PRODUCT_UPDATE), validate(updateProductSchema), ctrl.updateProduct);
productRouter.delete('/:id', authorize(PermissionKey.PRODUCT_DELETE), ctrl.deleteProduct);
