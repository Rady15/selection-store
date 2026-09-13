import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../database/store.js';

export interface AuthenticatedRequest extends Request {
  authUser?: any;
}

const JWT_SECRET = process.env.JWT_SECRET || '';

export function publicUser(user: any) {
  if (!user) return null;
  const { password, password_hash, ...safe } = user;
  return safe;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!JWT_SECRET) {
    return res.status(503).json({ error: 'Authentication is not configured' });
  }
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error_ar: 'يجب تسجيل الدخول', error_en: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'selection-api', audience: 'selection-web' }) as jwt.JwtPayload;
    const userId = String(payload.sub || '');
    const user = db.getUserById(userId);
    if (!user) return res.status(401).json({ error_ar: 'جلسة غير صالحة', error_en: 'Invalid session' });
    if (user.blocked) return res.status(403).json({ error_ar: 'الحساب محظور', error_en: 'Account is blocked' });
    req.authUser = user;
    return next();
  } catch {
    return res.status(401).json({ error_ar: 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً', error_en: 'Session expired, please log in again' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  return requireAuth(req, res, () => {
    if (req.authUser?.role !== 'admin') {
      return res.status(403).json({ error_ar: 'ليس لديك صلاحية الوصول', error_en: 'Administrator access required' });
    }
    return next();
  });
}
