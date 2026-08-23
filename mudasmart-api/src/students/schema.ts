import { z } from 'zod';

export const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().min(1).max(64).optional(),
  classId: z.coerce.number().int().positive().optional(),
}).strict();

// NIS immutable; isActive hanya lewat endpoint deactivate admin.
export const patchStudentSchema = z.object({
  fullName: z.string().trim().min(1).max(100).optional(),
  classId: z.number().int().positive().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'Tidak ada perubahan' });

export const idParamSchema = z.string().uuid();

// Import massal — baris CSV sudah dikonversi client menjadi JSON.
export const importRowSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  nis: z.string().trim().min(1).max(64),
  className: z.string().trim().min(1).max(64).optional(),
}).strict();
export const importStudentsSchema = z.object({
  rows: z.array(importRowSchema).min(1).max(200),
}).strict();
