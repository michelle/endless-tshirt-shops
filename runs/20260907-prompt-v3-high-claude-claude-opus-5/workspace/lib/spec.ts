/** The customer's answers, plus the garment they chose. This object is the
 *  single source of truth: it seeds the artwork, rides along in the Stripe
 *  Checkout Session metadata, and is replayed by the webhook to build the
 *  print file. Keep it small — Stripe metadata values cap at 500 chars. */

export const TEMPERAMENTS = [
  { id: "skittish", label: "Skittish", blurb: "bolts at the sound of a doorbell" },
  { id: "vengeful", label: "Vengeful", blurb: "keeps a ledger, settles it slowly" },
  { id: "melancholic", label: "Melancholic", blurb: "sighs in rooms you just left" },
  { id: "mischievous", label: "Mischievous", blurb: "hides one sock, never both" },
  { id: "devoted", label: "Devoted", blurb: "follows you room to room, always" },
  { id: "feral", label: "Feral", blurb: "no notes, no manners, no regrets" },
] as const;

export type TemperamentId = (typeof TEMPERAMENTS)[number]["id"];
export const TEMPERAMENT_IDS = TEMPERAMENTS.map((t) => t.id) as TemperamentId[];

export type CryptidSpec = {
  /** Who documented it. Drives the species epithet and the signature line. */
  keeper: string;
  /** Where it was sighted. Printed on the plate. */
  place: string;
  /** Hour it stirs, 0-23. */
  hour: number;
  /** What it feeds on. Printed as DIET. */
  appetite: string;
  temperament: TemperamentId;
  /** Re-roll counter. The answers still drive everything; this just lets a
   *  customer ask for another interpretation of the same answers. */
  twist: number;
};

export const LIMITS = {
  keeper: 22,
  place: 26,
  appetite: 34,
} as const;

export const APPETITE_SUGGESTIONS = [
  "unsent text messages",
  "cold pizza at 3am",
  "other people's playlists",
  "the last five minutes of sleep",
  "half-finished novels",
  "single socks",
  "expired coupons",
  "eye contact on the subway",
  "leftover birthday cake",
  "browser tabs",
  "second-hand embarrassment",
  "the crust of the bread",
];

const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;

function clean(v: unknown, max: number): string {
  return String(v ?? "")
    .replace(CONTROL_CHARS, "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function normalizeSpec(input: Partial<CryptidSpec>): CryptidSpec {
  const hourRaw = Number(input.hour);
  return {
    keeper: clean(input.keeper, LIMITS.keeper) || "Anonymous",
    place: clean(input.place, LIMITS.place) || "Parts Unknown",
    hour: Number.isFinite(hourRaw) ? Math.min(23, Math.max(0, Math.floor(hourRaw))) : 3,
    appetite: clean(input.appetite, LIMITS.appetite) || "whatever is left out",
    temperament: TEMPERAMENT_IDS.includes(input.temperament as TemperamentId)
      ? (input.temperament as TemperamentId)
      : "mischievous",
    twist: Number.isFinite(Number(input.twist))
      ? Math.min(999, Math.max(0, Math.floor(Number(input.twist))))
      : 0,
  };
}

export function specSeed(s: CryptidSpec): string {
  return [
    s.keeper.toLowerCase(),
    s.place.toLowerCase(),
    s.hour,
    s.appetite.toLowerCase(),
    s.temperament,
    s.twist,
  ].join("|");
}

/* ------------------------------------------------------------------ */
/* Compact, URL-safe encoding. Also used for the deterministic print-  */
/* file URL that Prodigi fetches, so it must round-trip exactly.       */
/* ------------------------------------------------------------------ */

function b64urlEncode(s: string): string {
  let b64: string;
  if (typeof btoa === "function") {
    const bytes = new TextEncoder().encode(s);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    b64 = btoa(bin);
  } else {
    b64 = Buffer.from(s, "utf8").toString("base64");
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  if (typeof atob === "function") {
    const bin = atob(padded);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(padded, "base64").toString("utf8");
}

/** Positional tuple rather than an object — keeps the token short. */
export function encodeSpec(s: CryptidSpec): string {
  return b64urlEncode(
    JSON.stringify([s.keeper, s.place, s.hour, s.appetite, s.temperament, s.twist])
  );
}

export function decodeSpec(token: string): CryptidSpec | null {
  try {
    const arr = JSON.parse(b64urlDecode(token));
    if (!Array.isArray(arr) || arr.length < 5) return null;
    return normalizeSpec({
      keeper: arr[0],
      place: arr[1],
      hour: arr[2],
      appetite: arr[3],
      temperament: arr[4],
      twist: arr[5] ?? 0,
    });
  } catch {
    return null;
  }
}
