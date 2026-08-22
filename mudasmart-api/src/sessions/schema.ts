import { z } from 'zod';

export const dateParamSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Format tanggal harus YYYY-MM-DD yang valid');
