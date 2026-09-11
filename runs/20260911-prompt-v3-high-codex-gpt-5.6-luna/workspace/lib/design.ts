export type Design = {
  name: string;
  vibe: string;
  note: string;
  accent: string;
  shirtColor: string;
  size: string;
  quantity: number;
};

export const VIBES = [
  { id: "night-shift", label: "Night shift", glyph: "◆", copy: "quiet focus" },
  { id: "sun-chaser", label: "Sun chaser", glyph: "◒", copy: "open horizon" },
  { id: "soft-static", label: "Soft static", glyph: "∿", copy: "beautiful noise" },
  { id: "deep-water", label: "Deep water", glyph: "≈", copy: "low frequency" }
] as const;

export const ACCENTS = [
  { value: "#d8ff45", label: "Signal lime" },
  { value: "#ff6b4a", label: "Heat orange" },
  { value: "#7c7cff", label: "Ultraviolet" },
  { value: "#62e5d2", label: "Aqua" }
] as const;

export const SHIRT_COLORS = [
  { value: "black", label: "Ink", hex: "#1d1d1b" },
  { value: "natural", label: "Natural", hex: "#e8dfd0" },
  { value: "asphalt", label: "Asphalt", hex: "#55575a" },
  { value: "white", label: "Cloud", hex: "#f3f1eb" }
] as const;

export const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"] as const;

export const DEFAULT_DESIGN: Design = {
  name: "Mica",
  vibe: "night-shift",
  note: "make room for the strange",
  accent: "#d8ff45",
  shirtColor: "black",
  size: "M",
  quantity: 1
};

export function getVibe(id: string) {
  return VIBES.find((vibe) => vibe.id === id) ?? VIBES[0];
}

export function encodeDesign(design: Design) {
  return Buffer.from(JSON.stringify(design), "utf8").toString("base64url");
}

export function decodeDesign(value: string | null | undefined): Design {
  try {
    const parsed = JSON.parse(Buffer.from(value ?? "", "base64url").toString("utf8"));
    return sanitizeDesign(parsed);
  } catch {
    return DEFAULT_DESIGN;
  }
}

export function sanitizeDesign(input: Partial<Design>): Design {
  const name = String(input.name ?? DEFAULT_DESIGN.name).replace(/[^a-zA-Z0-9 .'’-]/g, "").slice(0, 18) || DEFAULT_DESIGN.name;
  const note = String(input.note ?? DEFAULT_DESIGN.note).replace(/[^a-zA-Z0-9 .,!?/'’-]/g, "").slice(0, 42) || DEFAULT_DESIGN.note;
  const vibe = VIBES.some((item) => item.id === input.vibe) ? String(input.vibe) : DEFAULT_DESIGN.vibe;
  const accent = ACCENTS.some((item) => item.value === input.accent) ? String(input.accent) : DEFAULT_DESIGN.accent;
  const shirtColor = SHIRT_COLORS.some((item) => item.value === input.shirtColor) ? String(input.shirtColor) : DEFAULT_DESIGN.shirtColor;
  const size = SIZES.includes(String(input.size) as (typeof SIZES)[number]) ? String(input.size) : DEFAULT_DESIGN.size;
  const quantity = Math.min(5, Math.max(1, Number(input.quantity) || 1));
  return { name, vibe, note, accent, shirtColor, size, quantity };
}

export function artworkSvg(design: Design) {
  const vibe = getVibe(design.vibe);
  const escapedName = escapeXml(design.name.toUpperCase());
  const escapedNote = escapeXml(design.note.toUpperCase());
  const lineCount = 9;
  const lines = Array.from({ length: lineCount }, (_, index) => {
    const x1 = 240 + index * 55;
    const y1 = 620 + Math.sin(index * 1.8) * 130;
    const x2 = 2210 - index * 49;
    const y2 = 930 + Math.cos(index * 1.3) * 180;
    return `<path d="M ${x1} ${y1} C 700 ${y1 - 180}, 1280 ${y2 + 220}, ${x2} ${y2}" />`;
  }).join("");
  const dots = Array.from({ length: 24 }, (_, index) => {
    const angle = index * 0.93;
    const radius = 350 + (index % 5) * 90;
    const cx = 1245 + Math.cos(angle) * radius;
    const cy = 1440 + Math.sin(angle) * radius * 0.65;
    const r = index % 4 === 0 ? 18 : 8;
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" />`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="2490" height="3510" viewBox="0 0 2490 3510">
    <g fill="none" stroke="${design.accent}" stroke-linecap="round">
      <circle cx="1245" cy="1440" r="740" stroke-width="4" opacity=".18" />
      <circle cx="1245" cy="1440" r="530" stroke-width="4" opacity=".35" stroke-dasharray="12 28" />
      <circle cx="1245" cy="1440" r="315" stroke-width="8" opacity=".75" />
      <g stroke-width="7" opacity=".7">${lines}</g>
      <g fill="${design.accent}" stroke="none" opacity=".9">${dots}</g>
    </g>
    <g fill="${design.accent}" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">
      <text x="1245" y="400" font-size="72" font-weight="700" letter-spacing="18">PATCHWORK / FIELD NOTE</text>
      <text x="1245" y="1470" font-size="170" font-weight="700" letter-spacing="12">${escapedName}</text>
      <text x="1245" y="1640" font-size="46" font-weight="700" letter-spacing="14">${escapeXml(vibe.label.toUpperCase())} · ${vibe.glyph}</text>
      <text x="1245" y="2770" font-size="52" font-weight="700" letter-spacing="10">${escapedNote}</text>
      <text x="1245" y="3100" font-size="32" letter-spacing="9" opacity=".72">ONE OF ONE / SIGNAL ${hashCode(design.name + design.note)}</text>
    </g>
  </svg>`;
}

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[char] ?? char);
}

function hashCode(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash << 5) - hash + value.charCodeAt(index) | 0;
  return Math.abs(hash).toString(16).toUpperCase().padStart(6, "0").slice(0, 6);
}
