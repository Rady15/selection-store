import type { NextFunction, Response } from 'express';
import { db } from '../database/store.js';
import type { AuthenticatedRequest } from './security.js';

export function auditAdminMutation(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  try {
    db.addAuditLog({
      actor_user_id: req.authUser?.id,
      action: `${req.method} ${req.path}`,
      entity_type: req.path.split('/')[3] || 'admin',
      entity_id: req.params?.id,
      metadata: { ip: req.ip }
    });
  } catch (err) {
    console.error('[Audit] failed to write admin audit log', err);
  }
  return next();
}
