import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00.000Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, 'Invalid calendar date')
  .transform((s) => new Date(`${s}T00:00:00.000Z`));

const region = z.enum(['AU', 'NZ']);

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email().max(254),
  // bcrypt only uses the first 72 bytes
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  region: region.default('AU'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    region,
  })
  .partial();

export const transactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amountCents: z.number().int().positive().max(1_000_000_000),
  category: z.string().trim().min(1).max(40),
  description: z.string().trim().max(200).nullish(),
  date: isoDate,
  gstApplicable: z.boolean().default(false),
});

export const listQuerySchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  category: z.string().max(40).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const summaryQuerySchema = z.object({
  fy: z.coerce.number().int().min(2000).max(2100).optional(),
});
