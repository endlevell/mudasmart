import { Hono } from 'hono';
import './db/migrate';
import { auth } from './middleware/auth';
import { consumeLogin, consumeRefresh, failLogin, resetLogin } from './middleware/rate-limit';
import { authService } from './auth/service';
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from './auth/schema';

import type { ContentfulStatusCode } from 'hono/utils/http-status';

const ip = (context: { req: { header(name: string): string | undefined } }) => context.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
const userAgent = (context: { req: { header(name: string): string | undefined } }) => context.req.header('user-agent') ?? 'unknown';
const body = async <T>(request: Request, schema: { safeParse(input: unknown): { success: boolean; data?: T } }) => { const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) throw Object.assign(new Error('Data tidak valid'), { status: 400 }); return parsed.data as T; };
export const app = new Hono();
app.onError((error, context) => { const status = (error as Error & { status?: ContentfulStatusCode }).status; return context.json({ error: status ? error.message : 'Terjadi kesalahan server' }, status ?? 500); });
app.get('/api/health', (context) => context.json({ status: 'ok' }));
app.post('/api/auth/register', async (context) => context.json(await authService.register({ ...await body(context.req.raw, registerSchema), userAgent: userAgent(context) }, ip(context)), 201));
app.post('/api/auth/login', async (context) => { const clientIp = ip(context); if (!(await consumeLogin(clientIp))) return context.json({ error: 'Terlalu banyak percobaan' }, 429); try { const result = await authService.login({ ...await body(context.req.raw, loginSchema), userAgent: userAgent(context) }, clientIp); resetLogin(clientIp); return context.json(result); } catch (error) { failLogin(clientIp); throw error; } });
app.post('/api/auth/refresh', async (context) => { if (!(await consumeRefresh(ip(context)))) return context.json({ error: 'Terlalu banyak percobaan' }, 429); return context.json(await authService.refresh({ ...await body(context.req.raw, refreshSchema), userAgent: userAgent(context) }, ip(context))); });
app.post('/api/auth/logout', auth, async (context) => { authService.logout(context.get('auth').id, (await body(context.req.raw, logoutSchema)).refreshToken, ip(context)); return context.body(null, 204); });
app.get('/api/auth/me', auth, (context) => context.json({ user: context.get('auth') }));
