import { z } from 'zod';

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format jam harus HH:MM');

export const patchConfigSchema = z.object({
  checkInStart: hhmm,
  onTimeCutoff: hhmm,
  checkInEnd: hhmm,
}).strict();
