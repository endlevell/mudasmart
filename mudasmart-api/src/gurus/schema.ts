import { z } from 'zod';

export const guruIdParamSchema = z.string().uuid();

export const patchGuruSchema = z.object({
  isAdmin: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'Tidak ada perubahan' });
