import crypto from 'crypto';
import { userRepository } from '../repositories/user.repository';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { hashPassword } from '../lib/hash';
import { NotFoundError } from '../lib/errors';
import { CreateUserInput, UpdateUserInput } from '@inventory/shared';

export const userService = {
  async create(input: CreateUserInput, actorUserId: string) {
    const tempPassword = crypto.randomBytes(9).toString('base64url');
    const passwordHash = await hashPassword(tempPassword);
    const user = await userRepository.create({ ...input, passwordHash });
    console.log(`[stub email] Account activation for ${input.email}, temp password: ${tempPassword}`);
    await auditLogRepository.create({ userId: actorUserId, action: 'USER_CREATED', entityType: 'User', entityId: user.id, newValue: { email: input.email, roleIds: input.roleIds } });
    return user;
  },

  async update(id: string, input: UpdateUserInput, actorUserId: string) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new NotFoundError('User not found');
    const { roleIds, ...rest } = input;
    const updated = await userRepository.update(id, {
      ...rest,
      ...(roleIds ? { roles: { deleteMany: {}, create: roleIds.map((roleId) => ({ roleId })) } } : {}),
    });
    await auditLogRepository.create({ userId: actorUserId, action: 'USER_UPDATED', entityType: 'User', entityId: id, oldValue: existing, newValue: input });
    return updated;
  },

  async deactivate(id: string, actorUserId: string) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new NotFoundError('User not found');
    const result = await userRepository.softDelete(id);
    await auditLogRepository.create({ userId: actorUserId, action: 'USER_DEACTIVATED', entityType: 'User', entityId: id });
    return result;
  },

  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async list(params: { page: number; pageSize: number; search?: string }) {
    const skip = (params.page - 1) * params.pageSize;
    const [items, total] = await userRepository.list({ skip, take: params.pageSize, search: params.search });
    return { items, total, page: params.page, pageSize: params.pageSize };
  },
};
