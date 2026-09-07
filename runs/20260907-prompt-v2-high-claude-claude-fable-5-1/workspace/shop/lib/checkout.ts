import "server-only";
import { COUNTRY_CODES } from "./countries";
import type { Address } from "./prodigi";

export function validateAddress(raw: unknown): Address {
  const a = (raw ?? {}) as Record<string, unknown>;
  const str = (k: string, max = 120) => (typeof a[k] === "string" ? (a[k] as string).trim().slice(0, max) : "");
  const address: Address = {
    name: str("name"),
    email: str("email"),
    phone: str("phone", 40) || undefined,
    line1: str("line1"),
    line2: str("line2") || undefined,
    city: str("city"),
    state: str("state", 60) || undefined,
    postalCode: str("postalCode", 20),
    countryCode: str("countryCode", 2).toUpperCase(),
  };
  const missing = (["name", "email", "line1", "city", "postalCode", "countryCode"] as const).filter((k) => !address[k]);
  if (missing.length) throw new Error(`Missing: ${missing.join(", ")}`);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address.email)) throw new Error("Invalid email address");
  if (!COUNTRY_CODES.has(address.countryCode)) throw new Error("We don't ship to that country yet");
  if (["US", "CA", "AU"].includes(address.countryCode) && !address.state) throw new Error("State / province is required");
  return address;
}

export function newOrderRef() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return `OG-${s}`;
}
