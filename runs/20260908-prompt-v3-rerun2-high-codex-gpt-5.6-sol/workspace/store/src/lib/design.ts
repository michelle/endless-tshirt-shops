export type PaletteId = "solar" | "electric" | "acid";

export type Design = {
  name: string;
  place: string;
  date: string;
  note: string;
  palette: PaletteId;
};

export const PALETTES: Record<PaletteId, { primary: string; accent: string }> = {
  solar: { primary: "#ff5c39", accent: "#b8ffd8" },
  electric: { primary: "#9d7bff", accent: "#58e7ff" },
  acid: { primary: "#d9ff43", accent: "#ff77a8" },
};

export function seedFromDesign(design: Design) {
  const input = `${design.name}|${design.place}|${design.date}|${design.note}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function random(seed: number) {
  let value = seed || 1;
  return () => {
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function contourPaths(design: Design) {
  const rand = random(seedFromDesign(design));
  return Array.from({ length: 8 }, (_, ring) => {
    const points = Array.from({ length: 14 }, (_, point) => {
      const angle = (Math.PI * 2 * point) / 14;
      const base = 40 + ring * 22;
      const radius = base + (rand() - 0.5) * (11 + ring * 1.8);
      return [260 + Math.cos(angle) * radius * 1.15, 270 + Math.sin(angle) * radius] as const;
    });
    const first = points[0];
    const d = points.reduce((path, current, index) => {
      const next = points[(index + 1) % points.length];
      const midpoint = [(current[0] + next[0]) / 2, (current[1] + next[1]) / 2];
      return `${path} Q ${current[0].toFixed(1)} ${current[1].toFixed(1)} ${midpoint[0].toFixed(1)} ${midpoint[1].toFixed(1)}`;
    }, `M ${first[0].toFixed(1)} ${first[1].toFixed(1)}`);
    return `${d} Z`;
  });
}

export function validateDesign(input: unknown): Design {
  if (!input || typeof input !== "object") throw new Error("Add your design details first.");
  const value = input as Record<string, unknown>;
  const clean = (field: string, limit: number) => {
    const result = typeof value[field] === "string" ? value[field].trim() : "";
    if (!result || result.length > limit) throw new Error(`Check the ${field} field.`);
    return result;
  };
  const date = clean("date", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Choose a valid date.");
  const palette = value.palette;
  if (palette !== "solar" && palette !== "electric" && palette !== "acid") throw new Error("Choose a color signal.");
  return { name: clean("name", 18), place: clean("place", 28), date, note: clean("note", 42), palette };
}

export function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${month}.${day}.${year}`;
}
