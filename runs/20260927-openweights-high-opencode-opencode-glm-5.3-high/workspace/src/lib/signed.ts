/**
 * Signed, self-contained artwork URLs. The print file is a pure function of
 * the design spec, so it needs no storage: any serverless instance can render
 * it on demand. The HMAC keeps the endpoint from becoming a free render farm.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { DesignSpec } from "./params";

const SECRET = process.env.ARTWORK_SECRET || "";

function b64url(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}

export function encodeSpec(spec: DesignSpec): string {
  const compact = [
    spec.date,
    spec.time ?? "",
    spec.hemisphere,
    spec.garment,
    spec.line ?? "",
  ].join("|");
  return b64url(compact);
}

export function decodeSpec(payload: string): DesignSpec | null {
  try {
    const [date, time, hemisphere, garment, line] =
      Buffer.from(payload, "base64url").toString("utf8").split("|");
    if (!date || (hemisphere !== "N" && hemisphere !== "S")) return null;
    if (!["black", "navy", "cream"].includes(garment)) return null;
    return {
      date,
      time: time || undefined,
      hemisphere,
      garment: garment as DesignSpec["garment"],
      line: line || undefined,
    };
  } catch {
    return null;
  }
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function artworkUrl(spec: DesignSpec, origin: string): string {
  const payload = encodeSpec(spec);
  return `${origin}/api/artwork?p=${payload}&s=${sign(payload)}`;
}

export function verify(payload: string, signature: string): boolean {
  if (!SECRET || !/^[0-9a-f]{64}$/.test(signature)) return false;
  const expected = Buffer.from(sign(payload), "hex");
  const given = Buffer.from(signature, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
