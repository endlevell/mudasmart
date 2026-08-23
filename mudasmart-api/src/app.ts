import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import './db/migrate';
import { auth, requireAdmin, requireRole } from './middleware/auth';
import { consumeLogin, consumeRefresh, consumeRegister, consumeScan, consumeLeave, failLogin, resetLogin } from './middleware/rate-limit';
import { logger } from './lib/logger';
import { env } from './config/env';
import { authService } from './auth/service';
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from './auth/schema';
import { studentsService } from './students/service';
import { idParamSchema, listStudentsQuerySchema, patchStudentSchema } from './students/schema';
import { classesService } from './classes/service';
import { classIdParamSchema, createClassSchema, patchClassSchema } from './classes/schema';
import { sessionsService } from './sessions/service';
import { dateParamSchema } from './sessions/schema';
import { gatesService } from './gates/service';
import { createGateSchema, gateIdParamSchema, patchGateSchema } from './gates/schema';
import { configService } from './config/service';
import { patchConfigSchema } from './config/schema';
import { attendanceService } from './attendance/service';
import { historyQuerySchema, recordIdParamSchema, scanSchema } from './attendance/schema';
import { reportsService } from './reports/service';
import { dailyQuerySchema, exportQuerySchema, monthlyQuerySchema } from './reports/schema';
import { buildDailyWorkbook, buildMonthlyWorkbook } from './reports/export';
import { codesService } from './registration-codes/service';
import { codeParamSchema, createCodeSchema, patchCodeSchema } from './registration-codes/schema';
import { gurusService } from './gurus/service';
import { guruIdParamSchema, patchGuruSchema } from './gurus/schema';

import { leavesService } from './leaves/service';
import { createLeaveSchema, leaveIdParamSchema, listLeavesQuerySchema, reviewLeaveSchema } from './leaves/schema';
import { consumeLeave } from './middleware/rate-limit';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

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

// Header keamanan dasar + CORS terbatas ke origin yang diizinkan (mobile tidak butuh CORS; ini untuk web/debug).
app.use(secureHeaders());
if (env.CORS_ORIGIN) app.use('*', cors({ origin: env.CORS_ORIGIN.split(',').map((value) => value.trim()) }));

// Request logger — hanya metadata, tanpa body (password/token tidak pernah masuk log).
app.use(async (context, next) => {
  const start = Date.now();
  await next();
  logger.info('request', { method: context.req.method, path: context.req.path, status: context.res.status, ms: Date.now() - start });
});

app.onError((error, context) => { const status = (error as Error & { status?: ContentfulStatusCode }).status; return context.json({ error: status ? error.message : 'Terjadi kesalahan server' }, status ?? 500); });
app.get('/api/health', (context) => context.json({ status: 'ok' }));

// ===== Auth =====
app.post('/api/auth/register', async (context) => {
  if (!(await consumeRegister(ip(context)))) return context.json({ error: 'Terlalu banyak percobaan' }, 429);
  return context.json(await authService.register({ ...await body(context.req.raw, registerSchema), userAgent: userAgent(context) }, ip(context)), 201);
});
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

// ===== Sessions =====
app.post('/api/sessions/open', auth, requireRole('guru'), (context) => context.json(sessionsService.open(context.get('auth').id, ip(context))));
app.post('/api/sessions/close', auth, requireRole('guru'), (context) => context.json(sessionsService.close(context.get('auth').id, ip(context))));
app.get('/api/sessions/today', auth, (context) => context.json({ data: sessionsService.today() }));
app.get('/api/sessions/:date', auth, requireRole('guru'), (context) => context.json({ data: sessionsService.byDate(parse(context.req.param('date'), dateParamSchema, 'Parameter tidak valid')) }));

// ===== Gates (baca GURU; tulis admin) =====
app.get('/api/gates', auth, requireRole('guru'), (context) => context.json({ data: gatesService.list() }));
app.post('/api/gates', auth, requireAdmin, async (context) => context.json({ data: await gatesService.create(context.get('auth').id, ip(context), await body(context.req.raw, createGateSchema)) }, 201));
app.patch('/api/gates/:id', auth, requireAdmin, async (context) => context.json({ data: await gatesService.update(context.get('auth').id, ip(context), parse(context.req.param('id'), gateIdParamSchema, 'Parameter tidak valid'), await body(context.req.raw, patchGateSchema)) }));

// ===== Attendance config =====
app.get('/api/config/attendance', auth, (context) => context.json({ data: configService.get() }));
app.patch('/api/config/attendance', auth, requireAdmin, async (context) => context.json({ data: await configService.update(context.get('auth').id, ip(context), await body(context.req.raw, patchConfigSchema)) }));

// ===== Attendance (MURID) =====
app.post('/api/attendance/scan', auth, requireRole('murid'), async (context) => {
  if (!(await consumeScan(ip(context)))) return context.json({ error: 'Terlalu banyak percobaan' }, 429);
  const result = attendanceService.scan(context.get('auth'), await body(context.req.raw, scanSchema), ip(context), userAgent(context));
  return context.json(result.body, result.created ? 201 : 200);
});
app.get('/api/attendance/me', auth, requireRole('murid'), async (context) => context.json(await attendanceService.history(context.get('auth').id, parse(context.req.query(), historyQuerySchema, 'Parameter tidak valid'))));
app.get('/api/attendance/me/today', auth, requireRole('murid'), (context) => context.json({ data: attendanceService.todayRecord(context.get('auth').id) }));
// Guru/admin membatalkan absensi murid — record dihapus, murid bisa scan ulang.
app.delete('/api/attendance/records/:id', auth, requireRole('guru'), (context) => {
  attendanceService.cancelRecord(context.get('auth').id, ip(context), parse(context.req.param('id'), recordIdParamSchema, 'Parameter tidak valid'));
  return context.body(null, 204);
});

// ===== Leave requests (izin/sakit) =====
const MIME_BY_EXT: Record<string, string> = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

app.post('/api/leave-requests', auth, async (context) => {
  if (!(await consumeLeave(ip(context)))) return context.json({ error: 'Terlalu banyak percobaan' }, 429);
  const form = await context.req.formData();
  if (!form) return context.json({ error: 'Data tidak valid' }, 400);
  const input = parse(
    {
      studentId: form.get('studentId') ?? undefined,
      date: form.get('date'),
      type: form.get('type'),
      reason: form.get('reason'),
    },
    createLeaveSchema,
    'Data tidak valid',
  );
  const file = form.get('image');
  let image: { mimeType: string; bytes: Uint8Array } | undefined;
  if (file && typeof file === 'object' && 'arrayBuffer' in file) {
    image = { mimeType: file.type, bytes: new Uint8Array(await (file as File).arrayBuffer()) };
  }
  return context.json(await leavesService.create(context.get('auth'), ip(context), input, image), 201);
});
app.get('/api/leave-requests/me', auth, requireRole('murid'), (context) => context.json({ data: leavesService.mine(context.get('auth').id) }));
app.get('/api/leave-requests', auth, requireRole('guru'), (context) => context.json({ data: leavesService.list(parse(context.req.query(), listLeavesQuerySchema, 'Parameter tidak valid').status) }));
app.patch('/api/leave-requests/:id/review', auth, requireRole('guru'), async (context) => context.json(leavesService.review(context.get('auth').id, ip(context), parse(context.req.param('id'), leaveIdParamSchema, 'Parameter tidak valid'), (await body(context.req.raw, reviewLeaveSchema)).status)));
app.get('/api/leave-requests/:id/image', auth, (context) => {
  const id = parse(context.req.param('id'), leaveIdParamSchema, 'Parameter tidak valid');
  const leave = leavesService.imageOf(id);
  if (!leave?.imagePath) return context.json({ error: 'Lampiran tidak ditemukan' }, 404);
  if (!leavesService.canViewImage(context.get('auth'), leave)) return context.json({ error: 'Dilarang' }, 403);
  const uploadDir = process.env.UPLOAD_DIR ?? './data/uploads';
  const path = join(uploadDir, leave.imagePath);
  if (!existsSync(path)) return context.json({ error: 'Lampiran tidak ditemukan' }, 404);
  const ext = leave.imagePath.slice(leave.imagePath.lastIndexOf('.'));
  return new Response(readFileSync(path), { headers: { 'content-type': MIME_BY_EXT[ext] ?? 'application/octet-stream' } });
});

// ===== Registration codes (GURU+ADMIN) =====
app.get('/api/registration-codes', auth, requireAdmin, (context) => context.json({ data: codesService.list() }));
app.post('/api/registration-codes', auth, requireAdmin, async (context) => context.json({ data: await codesService.create(context.get('auth').id, ip(context), await body(context.req.raw, createCodeSchema)) }, 201));
app.patch('/api/registration-codes/:code', auth, requireAdmin, async (context) => context.json({ data: await codesService.update(context.get('auth').id, ip(context), parse(context.req.param('code'), codeParamSchema, 'Parameter tidak valid'), await body(context.req.raw, patchCodeSchema)) }));

// ===== Gurus (GURU+ADMIN) =====
app.get('/api/gurus', auth, requireAdmin, (context) => context.json({ data: gurusService.list() }));
app.patch('/api/gurus/:id/admin', auth, requireAdmin, async (context) => context.json({ data: await gurusService.setAdmin(context.get('auth').id, ip(context), parse(context.req.param('id'), guruIdParamSchema, 'Parameter tidak valid'), (await body(context.req.raw, patchGuruSchema)).isAdmin === true) }));
app.patch('/api/gurus/:id/deactivate', auth, requireAdmin, (context) => { gurusService.deactivate(context.get('auth').id, ip(context), parse(context.req.param('id'), guruIdParamSchema, 'Parameter tidak valid')); return context.body(null, 204); });

// ===== Reports (GURU) =====
app.get('/api/reports/daily', auth, requireRole('guru'), (context) => context.json(reportsService.daily(parse(context.req.query(), dailyQuerySchema, 'Parameter tidak valid'))));
app.get('/api/reports/monthly', auth, requireRole('guru'), (context) => context.json(reportsService.monthly(parse(context.req.query(), monthlyQuerySchema, 'Parameter tidak valid'))));
app.get('/api/reports/export', auth, requireRole('guru'), async (context) => {
  const query = parse(context.req.query(), exportQuerySchema, 'Parameter tidak valid');
  const buffer = query.type === 'daily'
    ? await buildDailyWorkbook(reportsService.daily({ date: query.date, classId: query.classId }))
    : await buildMonthlyWorkbook(reportsService.monthly({ month: query.month, classId: query.classId }));
  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="rekap-${query.type}.xlsx"`,
    },
  });
});
