import { z } from 'zod';

// Cermin aturan backend (auth/schema.ts) — pesan dalam Bahasa Indonesia untuk UI.
export const loginSchema = z.object({
  email: z.string().trim().email('Email tidak valid').max(254),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(128),
});

export const registerSchema = loginSchema.extend({
  fullName: z.string().trim().min(1, 'Nama lengkap wajib diisi').max(100),
  registrationCode: z.string().trim().min(1, 'Kode sekolah wajib diisi').max(64),
  nis: z.string().trim().max(64).optional(),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Konfirmasi kata sandi tidak sama',
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export const fieldErrors = (error: z.ZodError): Record<string, string> =>
  Object.fromEntries(error.issues.map((issue) => [String(issue.path[0] ?? ''), issue.message]));
