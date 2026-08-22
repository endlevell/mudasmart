import { z } from 'zod';

export const scanSchema = z.object({
  qrCodeValue: z.string().trim().min(1).max(128),
  clientNonce: z.string().uuid(),
  deviceId: z.string().uuid(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
}).strict().refine((value) => (value.latitude === undefined) === (value.longitude === undefined), { message: 'Koordinat tidak lengkap' });

export const historyQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Format bulan harus YYYY-MM').optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(31),
}).strict();
