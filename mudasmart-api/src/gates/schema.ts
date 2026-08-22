import { z } from 'zod';

const coordinate = (min: number, max: number) => z.number().min(min).max(max);

export const createGateSchema = z.object({
  name: z.string().trim().min(1).max(50),
  latitude: coordinate(-90, 90).optional(),
  longitude: coordinate(-180, 180).optional(),
  radiusMeters: z.number().int().min(10).max(10000).optional(),
}).strict();

export const patchGateSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  latitude: coordinate(-90, 90).nullable().optional(),
  longitude: coordinate(-180, 180).nullable().optional(),
  radiusMeters: z.number().int().min(10).max(10000).nullable().optional(),
  isActive: z.boolean().optional(),
  regenerateQr: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'Tidak ada perubahan' });

export const gateIdParamSchema = z.coerce.number().int().positive();
