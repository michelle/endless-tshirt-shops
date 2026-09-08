// Signed, self-contained design tokens. The print endpoint regenerates the
// artwork purely from the token, so no database is needed to fulfil an order,
// and nobody can use the renderer for arbitrary designs without the secret.
import { createHmac, timingSafeEqual } from "node:crypto";
import { Design, parseDesign } from "./design";

function secret(): string {
  const s = process.env.DESIGN_SIGNING_SECRET;
  if (!s || s.length < 16) throw new Error("DESIGN_SIGNING_SECRET is not configured");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function signDesign(design: Design): string {
  const payload = Buffer.from(JSON.stringify(design), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyDesignToken(token: string): Design | null {
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return parseDesign(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}
