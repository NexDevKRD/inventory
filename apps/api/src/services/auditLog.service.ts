import { auditLogRepository } from '../repositories/auditLog.repository';

export const auditLogService = {
  list(params: { page: number; pageSize: number; userId?: string; action?: string }) {
    const skip = (params.page - 1) * params.pageSize;
    return auditLogRepository.list({ skip, take: params.pageSize, userId: params.userId, action: params.action }).then(([items, total]) => ({ items, total, page: params.page, pageSize: params.pageSize }));
  },
};
