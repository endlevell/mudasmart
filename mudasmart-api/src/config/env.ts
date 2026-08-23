import { z } from 'zod';

const isProd = process.env.NODE_ENV === 'production';
// Production wajib secret eksplisit; development memakai fallback agar onboarding ringan.
const secret = isProd ? z.string().min(32) : z.string().optional().transform((value) => value ?? 'development-access-secret-change-me-32');

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('file:./data/mudasmart.db'),
  JWT_ACCESS_SECRET: secret,
  JWT_REFRESH_SECRET: secret,
  // Access token seumur refresh — dalam pemakaian normal TIDAK ada refresh/expired
  // yang pernah terlihat pengguna. Rotasi tetap jalan diam-diam.
  ACCESS_TOKEN_TTL: z.string().default('30d'),
  // Sesinya efektif setahun pemakaian normal.
  REFRESH_TOKEN_TTL: z.string().default('365d'),
  CORS_ORIGIN: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Env tidak valid: ${parsed.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join('; ')}`);
}

export const env = parsed.data;

if (isProd && env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_ACCESS_SECRET dan JWT_REFRESH_SECRET harus berbeda');
}
