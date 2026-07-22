import { roleRepository } from '../repositories/role.repository';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { NotFoundError } from '../lib/errors';
import { CreateRoleInput } from '@inventory/shared';

export const roleService = {
  list() {
    return roleRepository.list();
  },
  listPermissions() {
    return roleRepository.allPermissions();
  },
  async create(input: CreateRoleInput, actorUserId: string) {
    const role = await roleRepository.create(input);
    await auditLogRepository.create({ userId: actorUserId, action: 'ROLE_CREATED', entityType: 'Role', entityId: role.id, newValue: input });
    return role;
  },
  async setPermissions(roleId: string, permissionIds: string[], actorUserId: string) {
    const role = await roleRepository.findById(roleId);
    if (!role) throw new NotFoundError('Role not found');
    const result = await roleRepository.setPermissions(roleId, permissionIds);
    await auditLogRepository.create({ userId: actorUserId, action: 'ROLE_PERMISSIONS_CHANGED', entityType: 'Role', entityId: roleId, newValue: { permissionIds } });
    return result;
  },
};
