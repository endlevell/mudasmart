import { z } from 'zod';

const email = z.string().email().max(254);
const password = z.string().min(8).max(128);
const deviceId = z.string().uuid();
const identity = z.string().trim().min(1).max(64);
export const registerSchema = z.object({ email, password, fullName: z.string().trim().min(1).max(100), registrationCode: z.string().trim().min(1).max(64), deviceId, nis: identity.optional(), nip: identity.optional(), platform: z.string().trim().max(64).optional(), model: z.string().trim().max(128).optional() }).strict();
export const loginSchema = z.object({ email, password, deviceId, platform: z.string().trim().max(64).optional(), model: z.string().trim().max(128).optional() }).strict();
export const refreshSchema = z.object({ refreshToken: z.string().min(43).max(512), deviceId }).strict();
export const logoutSchema = z.object({ refreshToken: z.string().min(43).max(512) }).strict();
