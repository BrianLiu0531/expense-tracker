import type { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { HttpError } from '../lib/http.js';
import { REGIONS } from '../lib/region.js';
import { clearAuthCookie, getUserId, requireAuth, setAuthCookie } from '../middleware/auth.js';
import { loginSchema, registerSchema, updateProfileSchema } from '../schemas.js';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: { error: 'Too many attempts, please try again later' },
});

function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    region: user.region,
    regionConfig: REGIONS[user.region],
  };
}

authRouter.post('/register', authLimiter, async (req, res) => {
  const data = registerSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new HttpError(409, 'An account with this email already exists');

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      region: data.region,
      passwordHash: await bcrypt.hash(data.password, 12),
    },
  });
  setAuthCookie(res, user.id);
  res.status(201).json({ user: publicUser(user) });
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for unknown email and wrong password to avoid account enumeration
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  setAuthCookie(res, user.id);
  res.json({ user: publicUser(user) });
});

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: getUserId(req) } });
  if (!user) throw new HttpError(401, 'Not authenticated');
  res.json({ user: publicUser(user) });
});

authRouter.patch('/me', requireAuth, async (req, res) => {
  const data = updateProfileSchema.parse(req.body);
  const user = await prisma.user.update({ where: { id: getUserId(req) }, data });
  res.json({ user: publicUser(user) });
});
