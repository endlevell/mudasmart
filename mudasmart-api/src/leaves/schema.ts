import { z } from 'zod';

export const leaveIdParamSchema = z.coerce.number().int().positive();

export const createLeaveSchema = z.object({
  studentId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  type: z.enum(['sakit', 'izin']),
  reason: z.string().trim().min(3).max(500),
}).strict();

export const reviewLeaveSchema = z.object({
  status: z.enum(['approved', 'rejected']),
}).strict();

export const listLeavesQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
}).strict();
