import { RequestHandler } from 'express';
import { userService } from '../services/user.service';

export const createUser: RequestHandler = async (req, res, next) => {
  try {
    const user = await userService.create(req.body, req.user!.userId);
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
};
export const updateUser: RequestHandler = async (req, res, next) => {
  try {
    const user = await userService.update(req.params.id, req.body, req.user!.userId);
    res.status(200).json({ success: true, data: user });
  } catch (err) { next(err); }
};
export const deactivateUser: RequestHandler = async (req, res, next) => {
  try {
    await userService.deactivate(req.params.id, req.user!.userId);
    res.status(200).json({ success: true, data: null });
  } catch (err) { next(err); }
};
export const getUser: RequestHandler = async (req, res, next) => {
  try {
    const user = await userService.getById(req.params.id);
    res.status(200).json({ success: true, data: user });
  } catch (err) { next(err); }
};
export const listUsers: RequestHandler = async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const result = await userService.list({ page, pageSize, search: req.query.search as string | undefined });
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};
