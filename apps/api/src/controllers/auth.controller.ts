import { RequestHandler } from 'express';
import { authService } from '../services/auth.service';

const REFRESH_COOKIE = 'refreshToken';
const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/api/v1/auth' };

export const login: RequestHandler = async (req, res, next) => {
  try {
    const result = await authService.login(req.body, { ipAddress: req.ip, userAgent: req.get('user-agent') });
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOpts);
    res.status(200).json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
  } catch (err) { next(err); }
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing refresh token' } });
    const result = await authService.refresh(token, { ipAddress: req.ip, userAgent: req.get('user-agent') });
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOpts);
    res.status(200).json({ success: true, data: { accessToken: result.accessToken } });
  } catch (err) { next(err); }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) await authService.logout(token);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    res.status(200).json({ success: true, data: null });
  } catch (err) { next(err); }
};

export const forgotPassword: RequestHandler = async (req, res, next) => {
  try {
    await authService.requestPasswordReset(req.body.email);
    res.status(200).json({ success: true, data: null });
  } catch (err) { next(err); }
};

export const resetPassword: RequestHandler = async (req, res, next) => {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    res.status(200).json({ success: true, data: null });
  } catch (err) { next(err); }
};
