import { RequestHandler } from 'express';
import { PermissionKey } from '@inventory/shared';
import { stockService } from '../services/stock.service';
import { requestService } from '../services/request.service';
import { purchaseOrderService } from '../services/purchaseOrder.service';
import { deliveryService } from '../services/delivery.service';
import { notificationService } from '../services/notification.service';
import { dashboardService } from '../services/dashboard.service';
import { favouriteService } from '../services/favourite.service';

const ok = (res: any, data: unknown, status = 200) => res.status(status).json({ success: true, data });

const handler =
  (fn: (req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1]) => Promise<unknown>): RequestHandler =>
  async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err) {
      next(err);
    }
  };

const can = (req: Parameters<RequestHandler>[0], key: string) => !!req.user?.permissions.includes(key);

// --- Stock -----------------------------------------------------------------
export const listStock = handler(async (req, res) =>
  ok(
    res,
    await stockService.list({
      page: req.query.page,
      pageSize: req.query.pageSize,
      warehouseId: req.query.warehouseId as string | undefined,
      search: req.query.search as string | undefined,
      lowOnly: req.query.lowOnly as string | undefined,
    }),
  ),
);

export const adjustStock = handler(async (req, res) => {
  const result = await stockService.adjust(req.body, req.user!.userId);
  await stockService.recordAudit(req.user!.userId, req.body);
  return ok(res, result);
});

export const listStockMovements = handler(async (req, res) =>
  ok(
    res,
    await stockService.movements({
      page: req.query.page,
      pageSize: req.query.pageSize,
      productId: req.query.productId as string | undefined,
      warehouseId: req.query.warehouseId as string | undefined,
    }),
  ),
);

export const listLowStock = handler(async (_req, res) => ok(res, await stockService.lowStock(50)));
export const listExpiring = handler(async (req, res) =>
  ok(res, await stockService.expiring(Number(req.query.days ?? 90), 50)),
);

// --- Requests --------------------------------------------------------------
export const listRequests = handler(async (req, res) => {
  const canViewAll = can(req, PermissionKey.REQUEST_VIEW_ALL);
  return ok(
    res,
    await requestService.list({
      page: req.query.page,
      pageSize: req.query.pageSize,
      status: req.query.status as string | undefined,
      // Without the view-all permission a doctor only ever sees their own.
      doctorId: canViewAll ? (req.query.doctorId as string | undefined) : req.user!.userId,
    }),
  );
});

export const getRequest = handler(async (req, res) =>
  ok(
    res,
    await requestService.getById(req.params.id, {
      userId: req.user!.userId,
      canViewAll: can(req, PermissionKey.REQUEST_VIEW_ALL),
    }),
  ),
);

export const createRequest = handler(async (req, res) =>
  ok(res, await requestService.create(req.body, req.user!.userId), 201),
);

export const reviewRequest = handler(async (req, res) =>
  ok(res, await requestService.review(req.params.id, req.body, req.user!.userId)),
);

// --- Purchase orders -------------------------------------------------------
export const listPurchaseOrders = handler(async (req, res) => {
  // A supplier account is scoped to its own orders; staff see everything.
  const scoped = !can(req, PermissionKey.PURCHASE_ORDER_MANAGE);
  const supplierId = scoped
    ? await purchaseOrderService.supplierIdForUser(req.user!.userId)
    : (req.query.supplierId as string | undefined);

  return ok(
    res,
    await purchaseOrderService.list({
      page: req.query.page,
      pageSize: req.query.pageSize,
      status: req.query.status as string | undefined,
      supplierId,
    }),
  );
});

export const getPurchaseOrder = handler(async (req, res) => ok(res, await purchaseOrderService.getById(req.params.id)));
export const createPurchaseOrder = handler(async (req, res) =>
  ok(res, await purchaseOrderService.create(req.body, req.user!.userId), 201),
);
export const updatePurchaseOrderStatus = handler(async (req, res) =>
  ok(res, await purchaseOrderService.updateStatus(req.params.id, req.body, req.user!.userId)),
);

// --- Deliveries ------------------------------------------------------------
export const listDeliveries = handler(async (req, res) => {
  const canViewAll = can(req, PermissionKey.DELIVERY_VIEW_ALL);
  return ok(
    res,
    await deliveryService.list({
      page: req.query.page,
      pageSize: req.query.pageSize,
      status: req.query.status as string | undefined,
      assignedToId: canViewAll ? (req.query.assignedToId as string | undefined) : req.user!.userId,
    }),
  );
});

export const getDelivery = handler(async (req, res) =>
  ok(
    res,
    await deliveryService.getById(req.params.id, {
      userId: req.user!.userId,
      canViewAll: can(req, PermissionKey.DELIVERY_VIEW_ALL),
    }),
  ),
);

export const createDelivery = handler(async (req, res) =>
  ok(res, await deliveryService.create(req.body, req.user!.userId), 201),
);

export const updateDeliveryStatus = handler(async (req, res) =>
  ok(
    res,
    await deliveryService.updateStatus(req.params.id, req.body, {
      userId: req.user!.userId,
      canViewAll: can(req, PermissionKey.DELIVERY_VIEW_ALL),
    }),
  ),
);

export const listDeliveryStaff = handler(async (_req, res) => ok(res, await deliveryService.assignableStaff()));

// --- Notifications ---------------------------------------------------------
export const listNotifications = handler(async (req, res) =>
  ok(
    res,
    await notificationService.list(req.user!.userId, {
      page: req.query.page,
      pageSize: req.query.pageSize,
      unreadOnly: req.query.unreadOnly as string | undefined,
    }),
  ),
);
export const markNotificationRead = handler(async (req, res) => {
  await notificationService.markRead(req.params.id, req.user!.userId);
  return ok(res, null);
});
export const markAllNotificationsRead = handler(async (req, res) => {
  await notificationService.markAllRead(req.user!.userId);
  return ok(res, null);
});

// --- Favourites ------------------------------------------------------------
export const listFavourites = handler(async (req, res) => ok(res, await favouriteService.list(req.user!.userId)));
export const addFavourite = handler(async (req, res) =>
  ok(res, await favouriteService.add(req.user!.userId, req.params.productId), 201),
);
export const removeFavourite = handler(async (req, res) => {
  await favouriteService.remove(req.user!.userId, req.params.productId);
  return ok(res, null);
});

// --- Dashboards & reports --------------------------------------------------
export const getOverview = handler(async (_req, res) => ok(res, await dashboardService.overview()));
export const getDoctorDashboard = handler(async (req, res) =>
  ok(res, await dashboardService.forDoctor(req.user!.userId)),
);
export const getDriverDashboard = handler(async (req, res) =>
  ok(res, await dashboardService.forDriver(req.user!.userId)),
);
export const getSupplierDashboard = handler(async (req, res) => {
  const supplierId = await purchaseOrderService.supplierIdForUser(req.user!.userId);
  return ok(res, await dashboardService.forSupplier(supplierId));
});
export const getReports = handler(async (_req, res) => ok(res, await dashboardService.reports()));
