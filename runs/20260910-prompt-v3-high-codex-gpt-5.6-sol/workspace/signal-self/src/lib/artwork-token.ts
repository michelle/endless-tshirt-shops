import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { customizationSchema, type Customization } from "@/lib/product";

function secret() {
  const value = process.env.ARTWORK_SIGNING_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "development") return "signal-self-local-development-only";
  throw new Error("ARTWORK_SIGNING_SECRET is not configured");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createArtworkToken(customization: Customization) {
  const payload = Buffer.from(JSON.stringify(customization)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parseArtworkToken(token: string) {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) throw new Error("Invalid artwork token");
  const expected = sign(payload);
  const givenBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (givenBytes.length !== expectedBytes.length || !timingSafeEqual(givenBytes, expectedBytes)) {
    throw new Error("Invalid artwork signature");
  }
  return customizationSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
}
