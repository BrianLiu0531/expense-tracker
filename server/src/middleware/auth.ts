import type { Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import { HttpError } from '../lib/http.js';

export const AUTH_COOKIE = 'token';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

export function setAuthCookie(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: MAX_AGE_MS,
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, { httpOnly: true, sameSite: 'lax' });
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token: unknown = req.cookies?.[AUTH_COOKIE];
  if (typeof token !== 'string') throw new HttpError(401, 'Not authenticated');
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === 'string' || !payload.sub) throw new Error('Bad payload');
    req.userId = payload.sub;
  } catch {
    throw new HttpError(401, 'Session expired, please log in again');
  }
  next();
};

export function getUserId(req: Request): string {
  if (!req.userId) throw new HttpError(401, 'Not authenticated');
  return req.userId;
}
