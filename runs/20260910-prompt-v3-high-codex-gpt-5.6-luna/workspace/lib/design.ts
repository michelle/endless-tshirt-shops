import { createHmac, timingSafeEqual } from "node:crypto";

export type DesignInput = {
  place: string;
  name: string;
  message: string;
  accent: string;
  size: string;
  color: string;
};

const allowedAccents = new Set(["#f4a261", "#8ecae6", "#e9c46a", "#ff7f66", "#cdb4db"]);
const allowedSizes = new Set(["S", "M", "L", "XL", "2XL", "3XL"]);
const allowedColors = new Set(["black", "navy blue", "white"]);

export function validateDesign(value: unknown): DesignInput {
  if (!value || typeof value !== "object") throw new Error("A design is required.");
  const input = value as Record<string, unknown>;
  const text = (key: string, max: number, fallback: string) => {
    const item = typeof input[key] === "string" ? input[key] as string : fallback;
    const clean = item.trim().replace(/[<>]/g, "");
    if (!clean || clean.length > max) throw new Error(`Please check your ${key}.`);
    return clean;
  };
  const design = {
    place: text("place", 28, "Your place"),
    name: text("name", 16, "You"),
    message: text("message", 18, "stay curious"),
    accent: text("accent", 10, "#f4a261"),
    size: text("size", 3, "M"),
    color: text("color", 16, "black")
  };
  if (!allowedAccents.has(design.accent) || !allowedSizes.has(design.size) || !allowedColors.has(design.color)) {
    throw new Error("One of your tee options is not available.");
  }
  return design;
}

function secret() { return process.env.ART_TOKEN_SECRET || process.env.PRODIGI_API_KEY || "orbital-post-local-secret"; }

export function createArtToken(design: DesignInput) {
  const payload = Buffer.from(JSON.stringify(design)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readArtToken(token: string): DesignInput | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    return validateDesign(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
  } catch { return null; }
}

export function makePrintSvg(design: DesignInput) {
  const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const place = esc(design.place.toUpperCase());
  const name = esc(design.name.toUpperCase());
  const message = esc(design.message.toUpperCase());
  const accent = design.accent;
  const stars = Array.from({ length: 85 }, (_, i) => {
    const x = (i * 193 + 113) % 4200; const y = (i * 317 + 47) % 5370; const r = i % 11 === 0 ? 11 : i % 4 === 0 ? 7 : 4;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 9 === 0 ? accent : "#faf7ef"}" opacity="${i % 5 === 0 ? ".95" : ".6"}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="4200" height="5370" viewBox="0 0 4200 5370">
    <rect width="4200" height="5370" fill="#111318"/>${stars}
    <g fill="none" stroke="${accent}" stroke-width="7" opacity=".86"><ellipse cx="2100" cy="2150" rx="1750" ry="730" transform="rotate(22 2100 2150)"/><ellipse cx="2100" cy="2150" rx="2020" ry="920" transform="rotate(-14 2100 2150)" opacity=".42"/></g>
    <defs><radialGradient id="p" cx="35%" cy="28%"><stop offset="0" stop-color="#f7dcbf"/><stop offset=".25" stop-color="#dd926e"/><stop offset=".47" stop-color="#8c4438"/><stop offset=".72" stop-color="#3b2530"/><stop offset="1" stop-color="#161a25"/></radialGradient></defs>
    <circle cx="2100" cy="2150" r="790" fill="url(#p)"/><ellipse cx="2100" cy="2150" rx="1050" ry="155" fill="none" stroke="${accent}" stroke-width="7" transform="rotate(20 2100 2150)"/>
    <g fill="#faf7ef" font-family="Arial, Helvetica, sans-serif"><text x="300" y="3850" fill="${accent}" font-size="105" letter-spacing="20">ORBITAL POST / 01</text><text x="300" y="4220" font-size="280" font-weight="700" letter-spacing="-8">${place}</text><text x="300" y="4490" fill="${accent}" font-size="106" letter-spacing="15">${name} · ${message}</text><text x="300" y="4870" fill="#7d817e" font-size="70" letter-spacing="12">34°08′N 116°18′W  /  ONE OF ONE</text></g>
  </svg>`;
}
