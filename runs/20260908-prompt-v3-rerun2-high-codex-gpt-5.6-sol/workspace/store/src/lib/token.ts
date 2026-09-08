import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { validateDesign, type Design } from "./design";

function secret() {
  const value = process.env.DESIGN_SIGNING_SECRET;
  if (!value) throw new Error("DESIGN_SIGNING_SECRET is not configured.");
  return value;
}

export function signDesign(design: Design) {
  const payload = Buffer.from(JSON.stringify(design)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readDesignToken(token: string) {
  const [payload, provided] = token.split(".");
  if (!payload || !provided) throw new Error("Invalid artwork link.");
  const expected = createHmac("sha256", secret()).update(payload).digest();
  const actual = Buffer.from(provided, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error("Invalid artwork link.");
  return validateDesign(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
}
