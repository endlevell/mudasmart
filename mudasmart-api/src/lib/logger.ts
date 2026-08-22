const sensitive = /password|token|authorization|secret/i;
export const logger = {
  info(event: string, fields: Record<string, unknown> = {}) {
    console.info(JSON.stringify({ event, ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, sensitive.test(key) ? '[REDACTED]' : value])) }));
  },
};
