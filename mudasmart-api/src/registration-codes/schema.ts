import { z } from 'zod';

export const createCodeSchema = z.object({
  code: z.string().trim().min(4).max(64).regex(/^[A-Za-z0-9-]+$/, 'Kode hanya huruf, angka, dan tanda hubung'),
  roleAllowed: z.enum(['murid', 'guru']),
  maxUses: z.number().int().min(1).optional(),
  expiresAt: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/).optional(),
}).strict();

export const patchCodeSchema = z.object({
  isActive: z.boolean().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  expiresAt: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'Tidak ada perubahan' });

// Primary key tabel registration_codes adalah string `code`.
export const codeParamSchema = z.string().trim().min(4).max(64);
