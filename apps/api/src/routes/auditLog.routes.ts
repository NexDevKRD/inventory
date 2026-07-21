import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { PermissionKey } from '@inventory/shared';
import { listAuditLogs } from '../controllers/auditLog.controller';

export const auditLogRouter = Router();
auditLogRouter.use(authenticate, authorize(PermissionKey.AUDIT_LOG_VIEW));
auditLogRouter.get('/', listAuditLogs);
