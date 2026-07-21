import { RequestHandler } from 'express';
import { auditLogService } from '../services/auditLog.service';

export const listAuditLogs: RequestHandler = async (req, res, next) => {
  try {
    const result = await auditLogService.list({
      page: Number(req.query.page ?? 1),
      pageSize: Number(req.query.pageSize ?? 20),
      userId: req.query.userId as string | undefined,
      action: req.query.action as string | undefined,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
