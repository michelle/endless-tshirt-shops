/** Composes the finished field-guide plate.
 *
 *  The plate is authored at 1200x1600 (3:4). The same string is injected into
 *  the page for the live preview and rasterised server-side for the print
 *  file, so what the customer approves is exactly what the printer receives.
 */

import { Cryptid } from "../genome";
import { PRINT_AREA, Ink } from "../catalog";
import { renderCreature, CREATURE_GROUND } from "./creature";
import { circle, fmt } from "./geom";

export const PLATE = { w: 1200, h: 1600 } as const;

const INK_COLORS: Record<Ink, { ink: string; paper: string }> = {
  // Warm bone ink for dark garments, near-black for light ones.
  bone: { ink: "#F2EAD6", paper: "#111014" },
  coal: { ink: "#17150F", paper: "#F2EAD6" },
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/* Average glyph advance as a fraction of font-size. Good enough for line
 * breaking and shrink-to-fit; Space Mono is exact at 0.6em. */
const ADVANCE = {
  bebas: 0.4,
  serif: 0.47,
  serifItalic: 0.445,
  mono: 0.6,
} as const;

type Face = keyof typeof ADVANCE;

const FAMILY: Record<Face, string> = {
  bebas: "Bebas Neue",
  serif: "Old Standard TT",
  serifItalic: "Old Standard TT",
  mono: "Space Mono",
};

function width(text: string, size: number, face: Face, tracking = 0): number {
  return text.length * (size * ADVANCE[face] + tracking);
}

/** Shrink font-size until the string fits maxWidth. */
function fitSize(text: string, maxWidth: number, max: number, face: Face, tracking = 0): number {
  let s = max;
  while (s > 8 && width(text, s, face, tracking) > maxWidth) s -= 1;
  return s;
}

function wrap(text: string, maxWidth: number, size: number, face: Face): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (width(candidate, size, face) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

type TextOpts = {
  face?: Face;
  size?: number;
  fill?: string;
  anchor?: "start" | "middle" | "end";
  tracking?: number;
  weight?: number;
  italic?: boolean;
  opacity?: number;
};

function text(x: number, y: number, content: string, o: TextOpts = {}): string {
  const face = o.face ?? "serif";
  const attrs = [
    `x="${fmt(x)}"`,
    `y="${fmt(y)}"`,
    `font-family="${FAMILY[face]}"`,
    `font-size="${fmt(o.size ?? 24)}"`,
    `fill="${o.fill ?? "#000"}"`,
    `text-anchor="${o.anchor ?? "middle"}"`,
  ];
  if (o.tracking) attrs.push(`letter-spacing="${fmt(o.tracking)}"`);
  if (o.weight && o.weight >= 600) attrs.push(`font-weight="700"`);
  if (o.italic || face === "serifItalic") attrs.push(`font-style="italic"`);
  if (o.opacity !== undefined) attrs.push(`opacity="${o.opacity}"`);
  return `<text ${attrs.join(" ")}>${esc(content)}</text>`;
}

function rule(x1: number, y: number, x2: number, ink: string, w = 2, opacity = 1): string {
  return `<rect x="${fmt(x1)}" y="${fmt(y - w / 2)}" width="${fmt(x2 - x1)}" height="${fmt(
    w
  )}" fill="${ink}" opacity="${opacity}"/>`;
}

function diamond(cx: number, cy: number, r: number, ink: string): string {
  return `<path d="M${fmt(cx)} ${fmt(cy - r)}L${fmt(cx + r)} ${fmt(cy)}L${fmt(cx)} ${fmt(
    cy + r
  )}L${fmt(cx - r)} ${fmt(cy)}Z" fill="${ink}"/>`;
}

/** Scale annotation: an outlined 1.75 m human. Drawn as line art rather than
 *  a solid so it reads as a measurement, not a second creature. */
function humanScale(x: number, groundY: number, h: number, ink: string): string {
  const headR = h * 0.072;
  const sw = Math.max(1.4, h * 0.013);
  const p: string[] = [
    `<path d="${circle(x, groundY - h + headR, headR)}"/>`,
    // torso
    `<path d="M${fmt(x - h * 0.052)} ${fmt(groundY - h * 0.5)}L${fmt(x - h * 0.052)} ${fmt(
      groundY - h + headR * 2.5
    )}L${fmt(x + h * 0.052)} ${fmt(groundY - h + headR * 2.5)}L${fmt(x + h * 0.052)} ${fmt(
      groundY - h * 0.5
    )}Z"/>`,
    // arms
    `<path d="M${fmt(x - h * 0.052)} ${fmt(groundY - h * 0.76)}L${fmt(x - h * 0.1)} ${fmt(
      groundY - h * 0.44
    )}"/>`,
    `<path d="M${fmt(x + h * 0.052)} ${fmt(groundY - h * 0.76)}L${fmt(x + h * 0.1)} ${fmt(
      groundY - h * 0.44
    )}"/>`,
    // legs
    `<path d="M${fmt(x - h * 0.03)} ${fmt(groundY - h * 0.5)}L${fmt(x - h * 0.042)} ${fmt(groundY)}"/>`,
    `<path d="M${fmt(x + h * 0.03)} ${fmt(groundY - h * 0.5)}L${fmt(x + h * 0.042)} ${fmt(groundY)}"/>`,
  ];
  return `<g fill="none" stroke="${ink}" stroke-width="${fmt(sw)}" stroke-linejoin="round" stroke-linecap="round" opacity="0.5">${p.join(
    ""
  )}</g>`;
}

/** Vertical measuring bracket spanning the creature's drawn height. */
function heightBracket(
  x: number,
  topY: number,
  bottomY: number,
  lines: string[],
  ink: string
): string {
  const cap = 9;
  const labels = lines
    .map((line, i) =>
      text(x + 16, topY + 18 + i * 20, line, {
        face: "mono",
        size: 15,
        fill: ink,
        anchor: "start",
        tracking: 1.2,
        opacity: i === 0 ? 0.62 : 0.45,
      })
    )
    .join("");
  return `<g stroke="${ink}" stroke-width="1.8" opacity="0.55" fill="none">
<path d="M${fmt(x)} ${fmt(topY)}L${fmt(x)} ${fmt(bottomY)}"/>
<path d="M${fmt(x - cap)} ${fmt(topY)}L${fmt(x + cap)} ${fmt(topY)}"/>
<path d="M${fmt(x - cap)} ${fmt(bottomY)}L${fmt(x + cap)} ${fmt(bottomY)}"/>
</g>${labels}`;
}

/** Fixed vertical anchors. Working from a fixed grid rather than stacking
 *  keeps every plate on the same baselines no matter how long the copy is. */
const Y = {
  header: 120,
  headerRule: 146,
  artTop: 150,
  ground: 872,
  name: 976,
  place: 1024,
  binomial: 1068,
  ornament: 1102,
  notesTop: 1128,
  notesBottom: 1252,
  gridRuleTop: 1268,
  gridTop: 1274,
  gridRow: 84,
  gridRuleBottom: 1430,
  alias: 1462,
  footerRule: 1496,
  footer: 1526,
} as const;

export function renderPlate(c: Cryptid, inkMode: Ink, idPrefix = "cx"): string {
  const { ink } = INK_COLORS[inkMode];
  const M = 46;
  const W = PLATE.w;
  const H = PLATE.h;
  const inner = { x: M + 18, r: W - M - 18 };
  const contentW = inner.r - inner.x;

  const out: string[] = [];

  /* ---- frame ---- */
  out.push(
    `<rect x="${M}" y="${M}" width="${W - M * 2}" height="${H - M * 2}" fill="none" stroke="${ink}" stroke-width="5"/>`,
    `<rect x="${M + 12}" y="${M + 12}" width="${W - (M + 12) * 2}" height="${
      H - (M + 12) * 2
    }" fill="none" stroke="${ink}" stroke-width="1.6" opacity="0.75"/>`
  );
  for (const [cx, cy, sx, sy] of [
    [M + 12, M + 12, 1, 1],
    [W - M - 12, M + 12, -1, 1],
    [M + 12, H - M - 12, 1, -1],
    [W - M - 12, H - M - 12, -1, -1],
  ] as const) {
    out.push(
      `<path d="M${cx + sx * 34} ${cy}L${cx} ${cy}L${cx} ${cy + sy * 34}" fill="none" stroke="${ink}" stroke-width="5"/>`
    );
  }

  /* ---- header ---- */
  out.push(
    text(inner.x, Y.header, "FIELD GUIDE TO THE UNSEEN", {
      face: "mono", size: 19, fill: ink, anchor: "start", tracking: 5.4,
    }),
    text(inner.r, Y.header, `PLATE No. ${c.plateNo}`, {
      face: "mono", size: 19, fill: ink, anchor: "end", tracking: 5.4,
    }),
    rule(inner.x, Y.headerRule, inner.r, ink, 2.5)
  );

  /* ---- illustration ---- */
  const artScale = (Y.ground - Y.artTop) / CREATURE_GROUND;
  const artX = (W - 1000 * artScale) / 2;
  const creature = renderCreature(c.genome, INK_COLORS[inkMode], idPrefix);
  out.push(
    `<g transform="translate(${fmt(artX)} ${fmt(Y.artTop)}) scale(${fmt(artScale)})">${creature.svg}</g>`
  );

  /* ---- ground rule + survey ticks ---- */
  out.push(rule(inner.x + 24, Y.ground, inner.r - 24, ink, 2.4, 0.9));
  for (let i = 0; i <= 18; i++) {
    const x = inner.x + 24 + ((contentW - 48) * i) / 18;
    const len = i % 3 === 0 ? 13 : 7;
    out.push(rule(x - 1, Y.ground + len / 2, x + 1, ink, len, 0.6));
  }

  /* ---- scale reference ---- */
  const creatureTop = Y.artTop + creature.topY * artScale;
  const creaturePx = Y.ground - creatureTop;
  const feet = c.heightM * 3.28084;
  const humanH = (creaturePx * 1.75) / Math.max(0.3, c.heightM);
  const showHuman = humanH <= Y.ground - Y.artTop - 10;
  out.push(
    heightBracket(
      inner.x + 26,
      creatureTop,
      Y.ground,
      [
        `${c.heightM.toFixed(1)} m / ${Math.floor(feet)}'${Math.round((feet % 1) * 12)}"`,
        ...(showHuman ? ["human ref. 1.75 m"] : []),
      ],
      ink
    )
  );
  if (showHuman) {
    out.push(humanScale(inner.x + 98, Y.ground - 1, humanH, ink));
  }

  /* ---- naming block ---- */
  const nameUpper = c.commonName.toUpperCase();
  out.push(
    text(W / 2, Y.name, nameUpper, {
      face: "bebas",
      size: fitSize(nameUpper, contentW - 30, 112, "bebas", 4),
      fill: ink,
      tracking: 4,
    })
  );
  const ofPlace = `of ${c.spec.place}`;
  out.push(
    text(W / 2, Y.place, ofPlace, {
      face: "serifItalic",
      size: fitSize(ofPlace, contentW - 140, 38, "serifItalic"),
      fill: ink,
      opacity: 0.88,
    })
  );
  out.push(
    text(W / 2, Y.binomial, c.binomial, {
      face: "serifItalic",
      size: fitSize(c.binomial, contentW - 180, 33, "serifItalic"),
      fill: ink,
      opacity: 0.7,
    })
  );

  /* ---- ornament rule ---- */
  const halfGap = 40;
  out.push(
    rule(inner.x + 40, Y.ornament, W / 2 - halfGap, ink, 1.6, 0.65),
    rule(W / 2 + halfGap, Y.ornament, inner.r - 40, ink, 1.6, 0.65),
    diamond(W / 2, Y.ornament, 9, ink),
    diamond(W / 2 - 26, Y.ornament, 4.5, ink),
    diamond(W / 2 + 26, Y.ornament, 4.5, ink)
  );

  /* ---- field notes, centred inside their band ---- */
  const noteW = contentW - 130;
  let noteSize = 26;
  let noteLines = wrap(c.notes, noteW, noteSize, "serif");
  while (noteLines.length > 3 && noteSize > 20) {
    noteSize -= 1;
    noteLines = wrap(c.notes, noteW, noteSize, "serif");
  }
  noteLines = noteLines.slice(0, 4);
  const lineH = noteSize * 1.38;
  const bandMid = (Y.notesTop + Y.notesBottom) / 2;
  let ny = bandMid - ((noteLines.length - 1) * lineH) / 2 + noteSize * 0.34;
  for (const line of noteLines) {
    out.push(text(W / 2, ny, line, { face: "serif", size: noteSize, fill: ink, opacity: 0.92 }));
    ny += lineH;
  }

  /* ---- data grid ---- */
  const cols = 3;
  const colW = contentW / cols;
  out.push(rule(inner.x, Y.gridRuleTop, inner.r, ink, 1.6, 0.5));
  c.stats.forEach((cell, i) => {
    const cx = inner.x + (i % cols) * colW + 6;
    const cy = Y.gridTop + Math.floor(i / cols) * Y.gridRow;
    out.push(
      text(cx, cy + 24, cell.label, {
        face: "mono", size: 13.5, fill: ink, anchor: "start", tracking: 2.4, opacity: 0.6,
      }),
      text(cx, cy + 56, cell.value, {
        face: "serif",
        size: fitSize(cell.value, colW - 26, 26, "serif"),
        fill: ink,
        anchor: "start",
      })
    );
  });
  out.push(rule(inner.x, Y.gridRuleBottom, inner.r, ink, 1.6, 0.5));

  /* ---- alias + danger rating ---- */
  out.push(
    text(inner.x, Y.alias, `A.K.A. THE ${c.alias.toUpperCase()}`, {
      face: "mono", size: 14, fill: ink, anchor: "start", tracking: 2, opacity: 0.75,
    })
  );
  const pipGap = 26;
  const pipsX = inner.r - pipGap * 4 - 8;
  out.push(
    text(pipsX - 30, Y.alias, "DANGER", {
      face: "mono", size: 14, fill: ink, anchor: "end", tracking: 2, opacity: 0.75,
    })
  );
  for (let i = 0; i < 5; i++) {
    const cx = pipsX + i * pipGap;
    out.push(
      i < c.danger
        ? `<path d="${circle(cx, Y.alias - 5, 8)}" fill="${ink}"/>`
        : `<path d="${circle(cx, Y.alias - 5, 7)}" fill="none" stroke="${ink}" stroke-width="2" opacity="0.55"/>`
    );
  }

  /* ---- footer ---- */
  out.push(
    rule(inner.x, Y.footerRule, inner.r, ink, 2.5),
    text(inner.x, Y.footer, `DOCUMENTED BY ${c.spec.keeper.toUpperCase()}`, {
      face: "mono", size: 15, fill: ink, anchor: "start", tracking: 2.4,
    }),
    text(inner.r, Y.footer, `${c.specimenId} · ${c.firstSighted}`, {
      face: "mono", size: 15, fill: ink, anchor: "end", tracking: 2.4, opacity: 0.75,
    })
  );

  return out.join("\n");
}

/** Standalone SVG document for the on-site preview. */
export function plateSvg(c: Cryptid, inkMode: Ink, idPrefix = "cx"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PLATE.w} ${PLATE.h}" width="100%" height="100%" role="img" aria-label="${esc(
    c.commonName
  )} field guide plate">${renderPlate(c, inkMode, idPrefix)}</svg>`;
}

/** Print file: the plate centred on Prodigi's declared front print area,
 *  transparent everywhere else, so it lands at roughly 12in x 16in on the
 *  chest. Aspect matches the print area exactly, so no crop can occur. */
export function printSvg(c: Cryptid, inkMode: Ink): string {
  const target = { w: 3600, h: 4800 };
  const scale = target.w / PLATE.w;
  const x = (PRINT_AREA.width - target.w) / 2;
  const y = (PRINT_AREA.height - target.h) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PRINT_AREA.width}" height="${PRINT_AREA.height}" viewBox="0 0 ${PRINT_AREA.width} ${PRINT_AREA.height}">
<g transform="translate(${x} ${y}) scale(${scale})">${renderPlate(c, inkMode, "pr")}</g>
</svg>`;
}
