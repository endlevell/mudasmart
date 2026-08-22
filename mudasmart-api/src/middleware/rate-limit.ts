import { RateLimiterMemory } from 'rate-limiter-flexible';

const makeLimiters = () => ({
  login: new RateLimiterMemory({ points: 5, duration: 60 }),
  refresh: new RateLimiterMemory({ points: 10, duration: 60 }),
  scan: new RateLimiterMemory({ points: 10, duration: 60 }),
});
let limiters = makeLimiters();
const failures = new Map<string, { count: number; until: number }>();

export const consumeLogin = async (ip: string) => {
  if ((failures.get(ip)?.until ?? 0) > Date.now()) return false;
  try {
    await limiters.login.consume(ip);
    return true;
  } catch {
    return false;
  }
};
export const consumeRefresh = async (ip: string) => {
  try {
    await limiters.refresh.consume(ip);
    return true;
  } catch {
    return false;
  }
};
export const consumeScan = async (ip: string) => {
  try {
    await limiters.scan.consume(ip);
    return true;
  } catch {
    return false;
  }
};
// Backoff mulai berlaku setelah 5 kegagalan; maksimal 15 menit.
export const failLogin = (ip: string) => {
  const count = (failures.get(ip)?.count ?? 0) + 1;
  const until = count < 5 ? 0 : Date.now() + Math.min(2 ** (count - 5) * 60000, 900000);
  failures.set(ip, { count, until });
};
export const resetLogin = (ip: string) => {
  failures.delete(ip);
  limiters.login.delete(ip);
};
// Dipakai test agar rate limit antar-test tidak menumpuk.
export const resetRateLimits = () => {
  limiters = makeLimiters();
  failures.clear();
};
