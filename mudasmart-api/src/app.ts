import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import './db/migrate';
import { auth, requireAdmin, requireRole } from './middleware/auth';
import { consumeLogin, consumeRefresh, failLogin, resetLogin } from './middleware/rate-limit';
import { authService } from './auth/service';
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from './auth/schema';
import { studentsService } from './students/service';
import { idParamSchema, listStudentsQuerySchema, patchStudentSchema } from './students/schema';
import { classesService } from './classes/service';
import { classIdParamSchema, createClassSchema, patchClassSchema } from './classes/schema';

const ip = (context: { req: { header(name: string): string | undefined } }) => context.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
const userAgent = (context: { req: { header(name: string): string | undefined } }) => context.req.header('user-agent') ?? 'unknown';

type ParseResult<T> = { success: boolean; data?: T };
const parse = <T>(input: unknown, schema: { safeParse(input: unknown): ParseResult<T> }, message = 'Data tidak valid'): T => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw Object.assign(new Error(message), { status: 400 });
  return parsed.data as T;
};
const body = async <T>(request: Request, schema: { safeParse(input: unknown): ParseResult<T> }) => parse(await request.json().catch(() => null), schema);

export const app = new Hono();
app.onError((error, context) => { const status = (error as Error & { status?: ContentfulStatusCode }).status; return context.json({ error: status ? error.message : 'Terjadi kesalahan server' }, status ?? 500); });
app.get('/api/health', (context) => context.json({ status: 'ok' }));

// ===== Auth =====
app.post('/api/auth/register', async (context) => context.json(await authService.register({ ...await body(context.req.raw, registerSchema), userAgent: userAgent(context) }, ip(context)), 201));
app.post('/api/auth/login', async (context) => { const clientIp = ip(context); if (!(await consumeLogin(clientIp))) return context.json({ error: 'Terlalu banyak percobaan' }, 429); try { const result = await authService.login({ ...await body(context.req.raw, loginSchema), userAgent: userAgent(context) }, clientIp); resetLogin(clientIp); return context.json(result); } catch (error) { failLogin(clientIp); throw error; } });
app.post('/api/auth/refresh', async (context) => { if (!(await consumeRefresh(ip(context)))) return context.json({ error: 'Terlalu banyak percobaan' }, 429); return context.json(await authService.refresh({ ...await body(context.req.raw, refreshSchema), userAgent: userAgent(context) }, ip(context))); });
app.post('/api/auth/logout', auth, async (context) => { authService.logout(context.get('auth').id, (await body(context.req.raw, logoutSchema)).refreshToken, ip(context)); return context.body(null, 204); });
app.get('/api/auth/me', auth, (context) => context.json({ user: context.get('auth') }));

// ===== Students (GURU; deactivate admin) =====
app.get('/api/students', auth, requireRole('guru'), async (context) => context.json(await studentsService.list(parse(context.req.query(), listStudentsQuerySchema, 'Parameter tidak valid'))));
app.get('/api/students/:id', auth, requireRole('guru'), (context) => context.json({ data: studentsService.detail(parse(context.req.param('id'), idParamSchema, 'Parameter tidak valid')) }));
app.patch('/api/students/:id', auth, requireRole('guru'), async (context) => context.json({ data: studentsService.update(context.get('auth').id, ip(context), parse(context.req.param('id'), idParamSchema, 'Parameter tidak valid'), await body(context.req.raw, patchStudentSchema)) }));
app.patch('/api/students/:id/deactivate', auth, requireAdmin, (context) => { studentsService.deactivate(context.get('auth').id, ip(context), parse(context.req.param('id'), idParamSchema, 'Parameter tidak valid')); return context.body(null, 204); });
app.get('/api/students/:id/device', auth, requireRole('guru'), (context) => context.json({ data: studentsService.device(parse(context.req.param('id'), idParamSchema, 'Parameter tidak valid')) }));
app.patch('/api/students/:id/device/reset', auth, requireRole('guru'), (context) => { studentsService.resetDevice(context.get('auth').id, ip(context), parse(context.req.param('id'), idParamSchema, 'Parameter tidak valid')); return context.body(null, 204); });

// ===== Classes (list AUTH; tulis admin) =====
app.get('/api/classes', auth, (context) => context.json({ data: classesService.list() }));
app.get('/api/classes/:id', auth, requireRole('guru'), (context) => context.json(classesService.detail(parse(context.req.param('id'), classIdParamSchema, 'Parameter tidak valid'))));
app.post('/api/classes', auth, requireAdmin, async (context) => context.json(await classesService.create(context.get('auth').id, ip(context), await body(context.req.raw, createClassSchema)), 201));
app.patch('/api/classes/:id', auth, requireAdmin, async (context) => context.json(await classesService.update(context.get('auth').id, ip(context), parse(context.req.param('id'), classIdParamSchema, 'Parameter tidak valid'), await body(context.req.raw, patchClassSchema))));
