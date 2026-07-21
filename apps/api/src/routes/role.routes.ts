import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createRoleSchema, updateRolePermissionsSchema, PermissionKey } from '@inventory/shared';
import { listRoles, listPermissions, createRole, setRolePermissions } from '../controllers/role.controller';

export const roleRouter = Router();
roleRouter.use(authenticate, authorize(PermissionKey.ROLE_MANAGE));
roleRouter.get('/', listRoles);
roleRouter.get('/permissions', listPermissions);
roleRouter.post('/', validate(createRoleSchema), createRole);
roleRouter.patch('/:id/permissions', validate(updateRolePermissionsSchema), setRolePermissions);
