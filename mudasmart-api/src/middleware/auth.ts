import type { MiddlewareHandler } from 'hono';
import { repository, type User } from '../auth/repository';
import { verifyAccessToken, type Role } from '../lib/auth';

export const auth: MiddlewareHandler<{ Variables: { auth: User } }> = async (context, next) => {
  const value = context.req.header('authorization');
  if (!value?.startsWith('Bearer ')) return context.json({ error: 'Tidak terautentikasi' }, 401);
  try {
    const token = await verifyAccessToken(value.slice(7));
    const user = repository.activeUserById.get({ id: token.id });
    if (!user || user.role !== token.role) throw new Error('invalid token');
    context.set('auth', { ...user, isAdmin: user.isAdmin ?? false });
  } catch { return context.json({ error: 'Tidak terautentikasi' }, 401); }
  await next();
};
export const requireRole = (role: Role): MiddlewareHandler<{ Variables: { auth: User } }> => async (context, next) => context.get('auth').role === role ? next() : context.json({ error: 'Dilarang' }, 403);
export const requireAdmin: MiddlewareHandler<{ Variables: { auth: User } }> = async (context, next) => {
  const user = context.get('auth');
  if (user.role !== 'guru' || !user.isAdmin) return context.json({ error: 'Dilarang' }, 403);
  await next();
};
