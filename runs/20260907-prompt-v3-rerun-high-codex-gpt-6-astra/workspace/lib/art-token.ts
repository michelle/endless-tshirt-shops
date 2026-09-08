import { createHmac, timingSafeEqual } from "node:crypto";
import { designSchema, type Design } from "./design";
function sign(value: string) {
  if (!process.env.ARTWORK_SECRET) throw new Error("Artwork secret is missing");
  return createHmac("sha256", process.env.ARTWORK_SECRET)
    .update(value)
    .digest("base64url");
}
export function artworkToken(design: Design) {
  const value = Buffer.from(JSON.stringify(design)).toString("base64url");
  return value + "." + sign(value);
}
export function readArtworkToken(token: string) {
  if (token.length > 1500) throw new Error("Invalid artwork");
  const [value, signature, ...extra] = token.split(".");
  if (!value || !signature || extra.length) throw new Error("Invalid artwork");
  const expected = Buffer.from(sign(value));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new Error("Invalid artwork signature");
  return designSchema.parse(
    JSON.parse(Buffer.from(value, "base64url").toString()),
  );
}
