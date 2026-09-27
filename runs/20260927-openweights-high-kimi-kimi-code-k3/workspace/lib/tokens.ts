import crypto from "node:crypto";
import type { DesignParams } from "./design";

const secret = () => process.env.APP_SECRET || "starmark-dev-secret";

function hmac(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

export function signDesign(p: DesignParams): string {
  const payload = Buffer.from(JSON.stringify(p), "utf8").toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

export function verifyDesign(token: string): DesignParams | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = hmac(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/** Read the unsigned payload (for display only — never trust for fulfillment). */
export function readDesignUnsafe(token: string): DesignParams | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  try {
    return JSON.parse(
      Buffer.from(token.slice(0, dot), "base64url").toString("utf8")
    );
  } catch {
    return null;
  }
}
