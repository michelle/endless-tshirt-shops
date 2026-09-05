import crypto from "crypto";

export type Moment = { iso: string; ms: string; tz: string; ink?: "light" | "dark" };

function secret() {
  return process.env.ARTWORK_SIGNING_SECRET || process.env.STRIPE_SECRET_KEY || "development-only-secret";
}

export function signMoment(moment: Moment) {
  return crypto.createHmac("sha256", secret()).update(JSON.stringify(moment)).digest("hex");
}

export function isValidMoment(moment: Moment, signature: string) {
  const expected = signMoment(moment);
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function encodeMoment(moment: Moment) {
  return Buffer.from(JSON.stringify(moment)).toString("base64url");
}

export function decodeMoment(value: string): Moment | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!parsed?.iso || !parsed?.ms || !parsed?.tz || String(parsed.iso).length > 50) return null;
    return parsed as Moment;
  } catch { return null; }
}

export function artworkSvg(moment: Moment) {
  const date = new Date(moment.iso);
  const readable = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "medium", timeZone: moment.tz }).format(date);
  const escaped = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] || char));
  return `<svg width="4680" height="5790" viewBox="0 0 4680 5790" xmlns="http://www.w3.org/2000/svg">
    <rect width="4680" height="5790" fill="transparent"/>
    <g fill="${moment.ink === "dark" ? "#1E2735" : "#F7F0E3"}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif">
      <text x="2340" y="2240" font-size="142" letter-spacing="32">YOU ARE HERE</text>
      <text x="2340" y="2740" font-size="328" font-weight="700" letter-spacing="-12">${escaped(moment.ms)}</text>
      <path d="M1280 2920 H3400" stroke="${moment.ink === "dark" ? "#1E2735" : "#F7F0E3"}" stroke-width="12"/>
      <text x="2340" y="3145" font-size="96" letter-spacing="10">${escaped(readable.toUpperCase())}</text>
      <text x="2340" y="3360" font-size="76" letter-spacing="13">${escaped(moment.tz.toUpperCase())}</text>
      <circle cx="2340" cy="3650" r="24"/><text x="2340" y="3825" font-size="58" letter-spacing="12">A SMALL, TRUE RECORD</text>
    </g>
  </svg>`;
}
