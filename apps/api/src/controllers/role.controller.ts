import { RequestHandler } from 'express';
import { roleService } from '../services/role.service';

export const listRoles: RequestHandler = async (_req, res, next) => {
  try { res.json({ success: true, data: await roleService.list() }); } catch (err) { next(err); }
};
export const listPermissions: RequestHandler = async (_req, res, next) => {
  try { res.json({ success: true, data: await roleService.listPermissions() }); } catch (err) { next(err); }
};
export const createRole: RequestHandler = async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await roleService.create(req.body, req.user!.userId) }); } catch (err) { next(err); }
};
export const setRolePermissions: RequestHandler = async (req, res, next) => {
  try { res.json({ success: true, data: await roleService.setPermissions(req.params.id, req.body.permissionIds, req.user!.userId) }); } catch (err) { next(err); }
};
