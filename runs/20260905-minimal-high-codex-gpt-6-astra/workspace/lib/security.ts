import { createHmac, timingSafeEqual } from "node:crypto";
import { checkoutSchema, type CheckoutInput } from "./catalog";
import { required } from "./config";
function mac(scope: string, value: string) {
  return createHmac("sha256", required("ORDER_SIGNING_SECRET"))
    .update(`${scope}:${value}`)
    .digest("base64url");
}
export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function signDesign(input: CheckoutInput) {
  const payload = Buffer.from(
    JSON.stringify(checkoutSchema.parse(input)),
  ).toString("base64url");
  return `${payload}.${mac("artwork-v1", payload)}`;
}
export function verifyDesign(token: string): CheckoutInput {
  if (token.length > 650) throw new Error("Invalid design");
  const parts = token.split(".");
  if (parts.length !== 2 || !safeEqual(mac("artwork-v1", parts[0]), parts[1]))
    throw new Error("Invalid design");
  return checkoutSchema.parse(
    JSON.parse(Buffer.from(parts[0], "base64url").toString()),
  );
}
export function accessToken(requestId: string) {
  return mac("order-access-v1", requestId);
}
export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? new URL(request.url).host;
  let allowed = false;
  try {
    const url = new URL(origin ?? "");
    allowed = url.host === host && ["https:", "http:"].includes(url.protocol);
  } catch {}
  if (!allowed)
    throw new HttpError(403, "Please start checkout from the store.");
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function readJson(request: Request, maxBytes = 2048) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "A request body is required.");
  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "Request is too large.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Please send a valid request.");
  }
}
export function errorResponse(error: unknown, message: string) {
  const status = error instanceof HttpError ? error.status : 503;
  if (status >= 500)
    console.error(
      JSON.stringify({
        event: "request_failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    );
  return Response.json(
    { error: error instanceof HttpError ? error.message : message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
// Best-effort per-instance throttle; Vercel Firewall is the distributed perimeter.
const buckets = new Map<string, { count: number; until: number }>();
export function throttle(request: Request, scope: string, limit = 12) {
  const ip =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    "local";
  const key = scope + ":" + ip.split(",")[0];
  const now = Date.now();
  if (buckets.size > 5000)
    for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
  const current = buckets.get(key);
  if (current && current.until > now) {
    if (current.count >= limit)
      throw new HttpError(429, "Please wait a minute before trying again.");
    current.count++;
  } else buckets.set(key, { count: 1, until: now + 60000 });
}
