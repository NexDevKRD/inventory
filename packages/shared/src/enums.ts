export const RoleName = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  INVENTORY_STAFF: 'INVENTORY_STAFF',
  DOCTOR: 'DOCTOR',
  DELIVERY_STAFF: 'DELIVERY_STAFF',
  SUPPLIER: 'SUPPLIER',
} as const;
export type RoleName = (typeof RoleName)[keyof typeof RoleName];

export const PermissionKey = {
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DEACTIVATE: 'user.deactivate',
  ROLE_MANAGE: 'role.manage',
  AUDIT_LOG_VIEW: 'auditLog.view',

  CATEGORY_VIEW: 'category.view',
  CATEGORY_MANAGE: 'category.manage',

  PRODUCT_VIEW: 'product.view',
  PRODUCT_CREATE: 'product.create',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_DELETE: 'product.delete',

  WAREHOUSE_VIEW: 'warehouse.view',
  WAREHOUSE_MANAGE: 'warehouse.manage',

  STOCK_VIEW: 'stock.view',
  STOCK_ADJUST: 'stock.adjust',

  SUPPLIER_VIEW: 'supplier.view',
  SUPPLIER_MANAGE: 'supplier.manage',

  REQUEST_CREATE: 'request.create',
  REQUEST_VIEW_OWN: 'request.viewOwn',
  REQUEST_VIEW_ALL: 'request.viewAll',
  REQUEST_REVIEW: 'request.review',

  PURCHASE_ORDER_VIEW: 'purchaseOrder.view',
  PURCHASE_ORDER_MANAGE: 'purchaseOrder.manage',
  PURCHASE_ORDER_FULFIL: 'purchaseOrder.fulfil',

  DELIVERY_VIEW_OWN: 'delivery.viewOwn',
  DELIVERY_VIEW_ALL: 'delivery.viewAll',
  DELIVERY_ASSIGN: 'delivery.assign',
  DELIVERY_UPDATE: 'delivery.update',

  REPORT_VIEW: 'report.view',
  SETTINGS_MANAGE: 'settings.manage',
} as const;
export type PermissionKey = (typeof PermissionKey)[keyof typeof PermissionKey];

/** Default permission grants per system role, applied by the seed. */
export const ROLE_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  SUPER_ADMIN: Object.values(PermissionKey),
  INVENTORY_MANAGER: [
    PermissionKey.USER_CREATE,
    PermissionKey.USER_UPDATE,
    PermissionKey.AUDIT_LOG_VIEW,
    PermissionKey.CATEGORY_VIEW,
    PermissionKey.CATEGORY_MANAGE,
    PermissionKey.PRODUCT_VIEW,
    PermissionKey.PRODUCT_CREATE,
    PermissionKey.PRODUCT_UPDATE,
    PermissionKey.PRODUCT_DELETE,
    PermissionKey.WAREHOUSE_VIEW,
    PermissionKey.WAREHOUSE_MANAGE,
    PermissionKey.STOCK_VIEW,
    PermissionKey.STOCK_ADJUST,
    PermissionKey.SUPPLIER_VIEW,
    PermissionKey.SUPPLIER_MANAGE,
    PermissionKey.REQUEST_VIEW_ALL,
    PermissionKey.REQUEST_REVIEW,
    PermissionKey.PURCHASE_ORDER_VIEW,
    PermissionKey.PURCHASE_ORDER_MANAGE,
    PermissionKey.DELIVERY_VIEW_ALL,
    PermissionKey.DELIVERY_ASSIGN,
    PermissionKey.REPORT_VIEW,
  ],
  INVENTORY_STAFF: [
    PermissionKey.CATEGORY_VIEW,
    PermissionKey.PRODUCT_VIEW,
    PermissionKey.PRODUCT_UPDATE,
    PermissionKey.WAREHOUSE_VIEW,
    PermissionKey.STOCK_VIEW,
    PermissionKey.STOCK_ADJUST,
    PermissionKey.SUPPLIER_VIEW,
    PermissionKey.REQUEST_VIEW_ALL,
    PermissionKey.PURCHASE_ORDER_VIEW,
    PermissionKey.DELIVERY_VIEW_ALL,
    PermissionKey.REPORT_VIEW,
  ],
  DOCTOR: [
    PermissionKey.CATEGORY_VIEW,
    PermissionKey.PRODUCT_VIEW,
    // Needed to choose which warehouse a request is raised against.
    PermissionKey.WAREHOUSE_VIEW,
    PermissionKey.REQUEST_CREATE,
    PermissionKey.REQUEST_VIEW_OWN,
  ],
  DELIVERY_STAFF: [PermissionKey.DELIVERY_VIEW_OWN, PermissionKey.DELIVERY_UPDATE],
  SUPPLIER: [PermissionKey.PURCHASE_ORDER_VIEW, PermissionKey.PURCHASE_ORDER_FULFIL],
};

export const ProductStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const StockMovementType = {
  IN: 'IN',
  OUT: 'OUT',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;
export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType];

export const RequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  FULFILLED: 'FULFILLED',
} as const;
export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

export const PurchaseOrderStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;
export type PurchaseOrderStatus = (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus];

export const DeliveryStatus = {
  PENDING: 'PENDING',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
} as const;
export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus];
