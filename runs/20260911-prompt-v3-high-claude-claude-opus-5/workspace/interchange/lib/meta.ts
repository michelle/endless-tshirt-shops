/**
 * Stripe metadata values cap at 500 characters, so long tokens are split
 * across numbered keys.
 */
const CHUNK = 480;
const MAX_CHUNKS = 12;

export function putChunked(meta: Record<string, string>, key: string, value: string) {
  const chunks = Math.ceil(value.length / CHUNK);
  if (chunks > MAX_CHUNKS) throw new Error(`${key} is too large to store in metadata`);
  meta[`${key}_n`] = String(chunks);
  for (let i = 0; i < chunks; i++) meta[`${key}${i}`] = value.slice(i * CHUNK, (i + 1) * CHUNK);
}

export function getChunked(meta: Record<string, string> | null | undefined, key: string): string | null {
  if (!meta) return null;
  const n = parseInt(meta[`${key}_n`] || "", 10);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_CHUNKS) return null;
  let out = "";
  for (let i = 0; i < n; i++) {
    const part = meta[`${key}${i}`];
    if (part == null) return null;
    out += part;
  }
  return out;
}
