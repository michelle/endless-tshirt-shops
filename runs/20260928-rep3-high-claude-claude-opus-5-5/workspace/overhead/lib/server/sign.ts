import "server-only";
import crypto from "node:crypto";
import { Design, packDesign, unpackDesign } from "../design";
import { env, siteUrl } from "./env";

export type ArtKind = "print" | "mockup";

const sig = (kind: string, payload: string) =>
  crypto.createHmac("sha256", env.artSigningSecret()).update(`${kind}.${payload}`).digest("base64url").slice(0, 32);

/** A tamper-proof, stateless URL that renders this design (used by Prodigi and Stripe Checkout). */
export function signedArtUrl(kind: ArtKind, design: Design, req?: Request): string {
  const payload = Buffer.from(packDesign(design)).toString("base64url");
  return `${siteUrl(req)}/api/art/${kind}?d=${payload}&s=${sig(kind, payload)}`;
}

export function verifyArtParams(kind: string, payload: string | null, s: string | null): Design | null {
  if (!payload || !s) return null;
  const expected = sig(kind, payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(s);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return unpackDesign(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
