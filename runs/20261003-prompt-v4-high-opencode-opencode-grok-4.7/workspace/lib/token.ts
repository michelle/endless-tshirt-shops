import { createHmac, timingSafeEqual } from "crypto";
import type { DesignSpec } from "./catalog";

function secret(): string {
  const s = process.env.TOKEN_SECRET;
  if (!s) throw new Error("TOKEN_SECRET is not set");
  return s;
}

export function signDesign(spec: DesignSpec): string {
  const payload = Buffer.from(JSON.stringify(spec), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url").slice(0, 24);
  return `${payload}.${sig}`;
}

export function readDesign(token: string): DesignSpec {
  const clean = token.replace(/\.png$/i, "");
  const dot = clean.lastIndexOf(".");
  if (dot < 0) throw new Error("Bad print token");
  const payload = clean.slice(0, dot);
  const sig = clean.slice(dot + 1);
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url").slice(0, 24);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Bad print token");
  const spec = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DesignSpec;
  if (!spec || typeof spec.lat !== "number" || typeof spec.date !== "string") {
    throw new Error("Bad print token");
  }
  return spec;
}
