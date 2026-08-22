import { z } from 'zod';

const dateParam = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Format tanggal harus YYYY-MM-DD');
const monthParam = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Format bulan harus YYYY-MM');

export const dailyQuerySchema = z.object({
  date: dateParam.optional(),
  classId: z.coerce.number().int().positive().optional(),
}).strict();

export const monthlyQuerySchema = z.object({
  month: monthParam.optional(),
  classId: z.coerce.number().int().positive().optional(),
}).strict();

export const exportQuerySchema = z.object({
  type: z.enum(['daily', 'monthly']),
  date: dateParam.optional(),
  month: monthParam.optional(),
  classId: z.coerce.number().int().positive().optional(),
}).strict();
