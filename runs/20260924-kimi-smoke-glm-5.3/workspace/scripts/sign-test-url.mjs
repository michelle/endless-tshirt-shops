// Dev utility: print a signed /api/print URL for a sample spec.
import { createHmac } from "node:crypto";
const secret = process.env.SKYBORN_SIGNING_SECRET;
if (!secret) { console.error("set SKYBORN_SIGNING_SECRET first"); process.exit(1); }
const encoded = JSON.stringify([
  1, "2024-01-18", "21:00", "America/New_York", 40.713, -74.006,
  "New York, United States", "Elowen Grace", "The Night You Were Born",
  "for you", "navy blue", "m",
]);
const host = process.env.SKYBORN_HOST ?? "http://localhost:3100";
const p = Buffer.from(encoded, "utf8").toString("base64url");
const s = createHmac("sha256", secret).update(p).digest("base64url");
console.log(`${host}/api/print?p=${p}&s=${s}&w=1240`);
