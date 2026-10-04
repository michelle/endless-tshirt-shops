import { env } from 'cloudflare:workers';
export function db(): D1Database {
  if (!(env as any).DB) throw new Error('Order storage is temporarily unavailable.');
  return (env as any).DB;
}
