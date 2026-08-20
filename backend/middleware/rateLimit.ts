import type { NextFunction, Request, Response } from 'express';

interface Bucket { count: number; resetAt: number; }
const buckets = new Map<string, Bucket>();
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}, 60_000).unref();

export function rateLimit(options: { windowMs: number; max: number; key?: (req: Request) => string; message?: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = options.key?.(req) || String(req.ip || req.headers['x-forwarded-for'] || 'unknown');
    const bucketKey = `${options.max}:${options.windowMs}:${key}`;
    const current = buckets.get(bucketKey);
    if (!current || current.resetAt <= now) {
      buckets.set(bucketKey, { count: 1, resetAt: now + options.windowMs });
      return next();
    }
    current.count += 1;
    if (current.count > options.max) {
      res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
      return res.status(429).json({
        error_ar: options.message || 'تم تجاوز عدد المحاولات، حاول لاحقاً',
        error_en: 'Too many requests, please try again later'
      });
    }
    return next();
  };
}
