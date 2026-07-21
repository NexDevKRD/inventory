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
} as const;
export type PermissionKey = (typeof PermissionKey)[keyof typeof PermissionKey];
