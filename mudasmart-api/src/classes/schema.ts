import { z } from 'zod';

const academicYear = z.string().regex(/^\d{4}\/\d{4}$/, 'Tahun ajaran harus format YYYY/YYYY');

export const createClassSchema = z.object({
  name: z.string().trim().min(1).max(50),
  gradeLevel: z.number().int().min(1).max(13),
  academicYear,
  homeroomTeacherId: z.string().uuid().optional(),
}).strict();

export const patchClassSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  gradeLevel: z.number().int().min(1).max(13).optional(),
  academicYear: academicYear.optional(),
  homeroomTeacherId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'Tidak ada perubahan' });

export const classIdParamSchema = z.coerce.number().int().positive();
