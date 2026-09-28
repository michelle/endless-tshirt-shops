// Validate the env vars we expect to read at runtime. We keep this in one
// place so that the Stripe route handler can fail fast without trying to
// build a session against an empty secret.

export function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim().length === 0) {
    throw new Error(`${name} is required but is not set`);
  }
  return v;
}

export function optionalEnv(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v : fallback;
}

export function publicBaseUrl(req?: { url?: string } | null): string {
  const env = process.env.NEXT_PUBLIC_PUBLIC_BASE_URL;
  if (env && env.trim().length > 0) return env.replace(/\/$/, "");
  if (req?.url) {
    try {
      return new URL(req.url).origin;
    } catch {
      /* fall through */
    }
  }
  return "http://localhost:3000";
}
