import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize, authorizeAny } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  PermissionKey,
  adjustStockSchema,
  createRequestSchema,
  reviewRequestSchema,
  createPurchaseOrderSchema,
  updatePurchaseOrderStatusSchema,
  createDeliverySchema,
  updateDeliveryStatusSchema,
} from '@inventory/shared';
import * as ctrl from '../controllers/operations.controller';

export const stockRouter = Router();
stockRouter.use(authenticate);
stockRouter.get('/', authorize(PermissionKey.STOCK_VIEW), ctrl.listStock);
stockRouter.get('/low', authorize(PermissionKey.STOCK_VIEW), ctrl.listLowStock);
stockRouter.get('/expiring', authorize(PermissionKey.STOCK_VIEW), ctrl.listExpiring);
stockRouter.get('/movements', authorize(PermissionKey.STOCK_VIEW), ctrl.listStockMovements);
stockRouter.post('/adjust', authorize(PermissionKey.STOCK_ADJUST), validate(adjustStockSchema), ctrl.adjustStock);

export const requestRouter = Router();
requestRouter.use(authenticate);
requestRouter.get('/', authorizeAny(PermissionKey.REQUEST_VIEW_OWN, PermissionKey.REQUEST_VIEW_ALL), ctrl.listRequests);
requestRouter.get('/:id', authorizeAny(PermissionKey.REQUEST_VIEW_OWN, PermissionKey.REQUEST_VIEW_ALL), ctrl.getRequest);
requestRouter.post('/', authorize(PermissionKey.REQUEST_CREATE), validate(createRequestSchema), ctrl.createRequest);
requestRouter.patch('/:id/review', authorize(PermissionKey.REQUEST_REVIEW), validate(reviewRequestSchema), ctrl.reviewRequest);

export const purchaseOrderRouter = Router();
purchaseOrderRouter.use(authenticate);
purchaseOrderRouter.get('/', authorize(PermissionKey.PURCHASE_ORDER_VIEW), ctrl.listPurchaseOrders);
purchaseOrderRouter.get('/:id', authorize(PermissionKey.PURCHASE_ORDER_VIEW), ctrl.getPurchaseOrder);
purchaseOrderRouter.post('/', authorize(PermissionKey.PURCHASE_ORDER_MANAGE), validate(createPurchaseOrderSchema), ctrl.createPurchaseOrder);
purchaseOrderRouter.patch(
  '/:id/status',
  authorizeAny(PermissionKey.PURCHASE_ORDER_MANAGE, PermissionKey.PURCHASE_ORDER_FULFIL),
  validate(updatePurchaseOrderStatusSchema),
  ctrl.updatePurchaseOrderStatus,
);

export const deliveryRouter = Router();
deliveryRouter.use(authenticate);
deliveryRouter.get('/', authorizeAny(PermissionKey.DELIVERY_VIEW_OWN, PermissionKey.DELIVERY_VIEW_ALL), ctrl.listDeliveries);
deliveryRouter.get('/staff', authorize(PermissionKey.DELIVERY_ASSIGN), ctrl.listDeliveryStaff);
deliveryRouter.get('/:id', authorizeAny(PermissionKey.DELIVERY_VIEW_OWN, PermissionKey.DELIVERY_VIEW_ALL), ctrl.getDelivery);
deliveryRouter.post('/', authorize(PermissionKey.DELIVERY_ASSIGN), validate(createDeliverySchema), ctrl.createDelivery);
deliveryRouter.patch(
  '/:id/status',
  authorizeAny(PermissionKey.DELIVERY_UPDATE, PermissionKey.DELIVERY_ASSIGN),
  validate(updateDeliveryStatusSchema),
  ctrl.updateDeliveryStatus,
);

// Every authenticated user has their own notification feed and favourites.
export const notificationRouter = Router();
notificationRouter.use(authenticate);
notificationRouter.get('/', ctrl.listNotifications);
notificationRouter.post('/read-all', ctrl.markAllNotificationsRead);
notificationRouter.post('/:id/read', ctrl.markNotificationRead);

export const favouriteRouter = Router();
favouriteRouter.use(authenticate);
favouriteRouter.get('/', authorize(PermissionKey.PRODUCT_VIEW), ctrl.listFavourites);
favouriteRouter.post('/:productId', authorize(PermissionKey.PRODUCT_VIEW), ctrl.addFavourite);
favouriteRouter.delete('/:productId', authorize(PermissionKey.PRODUCT_VIEW), ctrl.removeFavourite);

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);
dashboardRouter.get('/overview', authorize(PermissionKey.STOCK_VIEW), ctrl.getOverview);
dashboardRouter.get('/doctor', authorize(PermissionKey.REQUEST_VIEW_OWN), ctrl.getDoctorDashboard);
dashboardRouter.get('/driver', authorize(PermissionKey.DELIVERY_VIEW_OWN), ctrl.getDriverDashboard);
dashboardRouter.get('/supplier', authorize(PermissionKey.PURCHASE_ORDER_VIEW), ctrl.getSupplierDashboard);
dashboardRouter.get('/reports', authorize(PermissionKey.REPORT_VIEW), ctrl.getReports);
