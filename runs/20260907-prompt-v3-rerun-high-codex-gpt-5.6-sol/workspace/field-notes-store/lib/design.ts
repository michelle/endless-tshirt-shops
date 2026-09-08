import { createHmac, timingSafeEqual } from "node:crypto";

export const PRODUCT = {
  sku: "GLOBAL-TEE-BC-3001",
  name: "The Field Shirt",
  unitAmount: 4200,
  currency: "usd",
  color: "black",
} as const;

export const PALETTES = {
  ridge: { name: "Night ridge", line: "#d6ff3f", route: "#ff6b57" },
  glacier: { name: "Glacier run", line: "#77dcff", route: "#ff8e47" },
  desert: { name: "Desert signal", line: "#f4cf85", route: "#547cff" },
} as const;

export const SIZES = ["s", "m", "l", "xl", "2xl", "3xl"] as const;

export type Design = {
  place: string;
  latitude: string;
  longitude: string;
  date: string;
  note: string;
  size: (typeof SIZES)[number];
  palette: keyof typeof PALETTES;
  quantity: number;
};

function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") throw new Error("Some design details are missing.");
  const clean = value.trim().replace(/\s+/g, " ").slice(0, max);
  if (!clean) throw new Error("Please complete every design field.");
  return clean;
}

function coordinate(value: unknown, min: number, max: number, label: string) {
  const clean = cleanText(value, 14);
  const number = Number(clean);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`Enter a valid ${label}.`);
  }
  return number.toFixed(4).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function parseDesign(input: unknown): Design {
  if (!input || typeof input !== "object") throw new Error("Design details are missing.");
  const value = input as Record<string, unknown>;
  const size = cleanText(value.size, 4).toLowerCase();
  const palette = cleanText(value.palette, 12).toLowerCase();
  const quantity = Number(value.quantity);
  if (!SIZES.includes(size as Design["size"])) throw new Error("Choose an available size.");
  if (!(palette in PALETTES)) throw new Error("Choose an available ink story.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 4) throw new Error("Quantity must be between 1 and 4.");

  const date = cleanText(value.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error("Enter a valid memory date.");
  }

  return {
    place: cleanText(value.place, 40),
    latitude: coordinate(value.latitude, -90, 90, "latitude"),
    longitude: coordinate(value.longitude, -180, 180, "longitude"),
    date,
    note: cleanText(value.note, 38),
    size: size as Design["size"],
    palette: palette as Design["palette"],
    quantity,
  };
}

export function designFromMetadata(metadata: Record<string, string>): Design {
  return parseDesign({ ...metadata, quantity: Number(metadata.quantity) });
}

function hashText(value: string) {
  return Array.from(value).reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 9187);
}

function contourPath(index: number, seed: number) {
  const phase = ((seed % 997) / 997) * Math.PI * 2;
  const base = 42 + index * 18;
  const points = Array.from({ length: 13 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const wobble = Math.sin(angle * 3 + phase + index * 0.7) * (7 + index * 0.7);
    const x = 220 + Math.cos(angle) * (base + wobble) + Math.sin(phase * 2 + index) * 8;
    const y = 205 + Math.sin(angle) * (base * 0.78 + wobble) + Math.cos(phase + index) * 9;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `${points.join(" ")} Z`;
}

function xml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!);
}

export function makePrintSvg(design: Design) {
  const palette = PALETTES[design.palette];
  const seed = hashText(`${design.place}${design.latitude}${design.longitude}${design.date}${design.note}`);
  const paths = Array.from({ length: 10 }, (_, index) => `<path d="${contourPath(index, seed)}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="4680" height="5790" viewBox="0 0 440 540">
    <g fill="none" stroke="${palette.line}" stroke-width="1.25" opacity="0.92">${paths}</g>
    <path d="M90 430 C130 365 115 280 205 250 S285 175 348 104" fill="none" stroke="${palette.route}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="205" cy="250" r="7" fill="#101313" stroke="${palette.route}" stroke-width="2"/><circle cx="205" cy="250" r="2" fill="${palette.route}"/>
    <g font-family="Arial,Helvetica,sans-serif"><text x="28" y="43" font-size="9" font-weight="700" letter-spacing="1.1" fill="${palette.line}">FIELDMARK / PERSONAL TOPOGRAPHY</text>
    <text x="28" y="473" font-size="24" font-weight="700" fill="#f3f2e9">${xml(design.place.slice(0, 28).toUpperCase())}</text>
    <text x="28" y="499" font-size="9" font-weight="700" letter-spacing="1.1" fill="${palette.line}">${xml(design.latitude)}° / ${xml(design.longitude)}° · ${xml(design.date)}</text>
    <text x="28" y="520" font-size="10" font-weight="700" letter-spacing="1.1" fill="#f3f2e9">${xml(design.note.toUpperCase())}</text></g>
  </svg>`;
}

export function encodeDesign(design: Design) {
  return Buffer.from(JSON.stringify(design)).toString("base64url");
}

export function signArtwork(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function isValidArtworkSignature(payload: string, signature: string, secret: string) {
  const expected = signArtwork(payload, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
