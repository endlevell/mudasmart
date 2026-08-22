import { RateLimiterMemory } from 'rate-limiter-flexible';

const login = new RateLimiterMemory({ points: 5, duration: 60 });
const refresh = new RateLimiterMemory({ points: 10, duration: 60 });
const failures = new Map<string, { count: number; until: number }>();
export const consumeLogin = async (ip: string) => { if ((failures.get(ip)?.until ?? 0) > Date.now()) return false; try { await login.consume(ip); return true; } catch { return false; } };
export const consumeRefresh = async (ip: string) => { try { await refresh.consume(ip); return true; } catch { return false; } };
export const failLogin = (ip: string) => { const count = (failures.get(ip)?.count ?? 0) + 1; failures.set(ip, { count, until: Date.now() + Math.min(2 ** Math.max(0, count - 5) * 60000, 900000) }); };
export const resetLogin = (ip: string) => { failures.delete(ip); login.delete(ip); };
