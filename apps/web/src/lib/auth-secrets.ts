// Centralized JWT secret management — hard fail in production if not configured
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_ACCESS_SECRET)  throw new Error('FATAL: JWT_ACCESS_SECRET must be set in production');
  if (!process.env.JWT_REFRESH_SECRET) throw new Error('FATAL: JWT_REFRESH_SECRET must be set in production');
}

export const ACCESS_SECRET  = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET  ?? 'dev-access-secret-change-me');
export const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me');
