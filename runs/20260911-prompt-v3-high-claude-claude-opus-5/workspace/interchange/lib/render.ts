import { GARMENTS, Spec, serialOf } from "./spec";
import { M, Pt, Rect, layout } from "./layout";
import { capHeight, measure, textPath, Weight } from "./text";

export const CANVAS = { w: 1240, h: 1534 };
const PAD = 76;

const n2 = (v: number) => (Math.round(v * 100) / 100).toString();

const tm = {
  measure: (t: string, size: number, weight: Weight) => measure(t, { size, weight }),
  cap: (size: number, weight: Weight) => capHeight(size, weight),
};

/* ------------------------------------------------------------------ colour */

function hexToRgb(hex: string) {
  const v = parseInt(hex.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}
const rgbToHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("");

const luma = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

/** Keep every line colour readable against the garment it is printed on. */
export function adaptColor(hex: string, darkGarment: boolean): string {
  const l = luma(hex);
  const { r, g, b } = hexToRgb(hex);
  if (!darkGarment && l > 0.55) {
    const f = 0.52 / l;
    return rgbToHex(r * f, g * f, b * f);
  }
  if (darkGarment && l < 0.28) {
    const f = 0.42 / Math.max(l, 0.05);
    return rgbToHex(Math.min(255, r * f), Math.min(255, g * f), Math.min(255, b * f));
  }
  return hex;
}

/* -------------------------------------------------------------------- path */

function roundedPath(pts: Pt[], r: number): string {
  if (pts.length < 2) return "";
  const d: string[] = [`M ${n2(pts[0].x)} ${n2(pts[0].y)}`];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i - 1];
    const c = pts[i];
    const q = pts[i + 1];
    const l1 = Math.hypot(c.x - p.x, c.y - p.y);
    const l2 = Math.hypot(q.x - c.x, q.y - c.y);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const a = { x: c.x + ((p.x - c.x) / l1) * rr, y: c.y + ((p.y - c.y) / l1) * rr };
    const b = { x: c.x + ((q.x - c.x) / l2) * rr, y: c.y + ((q.y - c.y) / l2) * rr };
    d.push(`L ${n2(a.x)} ${n2(a.y)}`, `Q ${n2(c.x)} ${n2(c.y)} ${n2(b.x)} ${n2(b.y)}`);
  }
  const last = pts[pts.length - 1];
  d.push(`L ${n2(last.x)} ${n2(last.y)}`);
  return d.join(" ");
}

function donut(cx: number, cy: number, R: number, r: number): string {
  return (
    `M ${n2(cx - R)} ${n2(cy)} a ${R} ${R} 0 1 0 ${2 * R} 0 a ${R} ${R} 0 1 0 ${-2 * R} 0 Z ` +
    `M ${n2(cx - r)} ${n2(cy)} a ${r} ${r} 0 1 1 ${2 * r} 0 a ${r} ${r} 0 1 1 ${-2 * r} 0 Z`
  );
}

/** Shrink a headline until it fits the measure. */
function fitSize(text: string, maxWidth: number, ideal: number, weight: Weight, tracking: number, min: number) {
  let size = ideal;
  while (size > min && measure(text, { size, weight, tracking }) > maxWidth) size -= 1;
  return size;
}

function T(text: string, x: number, y: number, size: number, weight: Weight, fill: string, opts: { anchor?: "start" | "middle" | "end"; tracking?: number; opacity?: number } = {}) {
  if (!text) return "";
  const d = textPath(text, x, y, { size, weight, tracking: opts.tracking, anchor: opts.anchor });
  if (!d) return "";
  const op = opts.opacity != null ? ` opacity="${opts.opacity}"` : "";
  return `<path d="${d}" fill="${fill}"${op}/>`;
}

/* ------------------------------------------------------------------- front */

export function renderFront(spec: Spec): string {
  const garment = GARMENTS[spec.garment];
  const ink = garment.dark ? "#F5F2EA" : "#15161B";
  const parts: string[] = [];

  const inner = CANVAS.w - PAD * 2;

  // --- masthead
  const titleSize = fitSize(spec.title, inner, 74, 800, 0.01, 30);
  parts.push(T(spec.title, CANVAS.w / 2, 118, titleSize, 800, ink, { anchor: "middle", tracking: 0.01 }));

  if (spec.subtitle) {
    const subSize = fitSize(spec.subtitle, inner * 0.9, 22, 600, 0.2, 13);
    parts.push(T(spec.subtitle, CANVAS.w / 2, 164, subSize, 600, ink, { anchor: "middle", tracking: 0.2, opacity: 0.72 }));
  }
  parts.push(
    `<rect x="${PAD}" y="196" width="${inner}" height="2.5" fill="${ink}" opacity="0.35"/>`,
  );

  // --- legend block sits under the map; reserve its height first
  const legendRows = Math.ceil(spec.lines.length / 2);
  const legendH = legendRows * 46;
  const footerY = CANVAS.h - 74;
  const legendTop = footerY - 44 - legendH;

  const region: Rect = { x: PAD + 4, y: 262, w: inner - 8, h: legendTop - 46 - 262 };

  const L = layout(spec, region, tm);

  // --- routes
  for (const line of L.lines) {
    const color = adaptColor(line.color, garment.dark);
    parts.push(
      `<path d="${roundedPath(line.pts, M.corner)}" fill="none" stroke="${color}" stroke-width="${M.stroke}" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
  }

  // --- station marks
  for (const s of L.stations) {
    if (s.atOwner) continue; // the owning line already drew this interchange
    if (s.interchange) {
      parts.push(`<path d="${donut(s.pt.x, s.pt.y, M.ringOuter, M.ringInner)}" fill="${ink}" fill-rule="evenodd"/>`);
    } else {
      const px = -s.dir.y;
      const py = s.dir.x;
      const h = M.tickLen / 2;
      parts.push(
        `<line x1="${n2(s.pt.x - px * h)}" y1="${n2(s.pt.y - py * h)}" x2="${n2(s.pt.x + px * h)}" y2="${n2(s.pt.y + py * h)}" stroke="${ink}" stroke-width="${M.tickWidth}" stroke-linecap="round"/>`,
      );
    }
  }

  // --- station labels
  for (const lb of L.labels) {
    const { station: s } = lb;
    const b1 = lb.top + lb.capL;
    const b2 = lb.top + lb.capL + M.labelGap + lb.capN;
    const label = T(s.label, 0, b1, M.labelSize, 600, ink, { anchor: lb.anchor });
    const note = s.note ? T(s.note.toUpperCase(), 0, b2, M.noteSize, 400, ink, { anchor: lb.anchor, opacity: 0.6, tracking: 0.06 }) : "";
    parts.push(
      `<g transform="translate(${n2(lb.x)} ${n2(lb.y)})${lb.rotate ? ` rotate(${lb.rotate})` : ""}">${label}${note}</g>`,
    );
  }

  // --- legend
  parts.push(`<rect x="${PAD}" y="${n2(legendTop - 30)}" width="${inner}" height="2" fill="${ink}" opacity="0.25"/>`);
  const colW = inner / 2;
  spec.lines.forEach((line, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = PAD + col * colW;
    const y = legendTop + row * 46 + 16;
    parts.push(
      `<rect x="${n2(x)}" y="${n2(y - 6)}" width="52" height="12" rx="6" fill="${adaptColor(line.color, garment.dark)}"/>`,
    );
    const nameSize = fitSize(line.name.toUpperCase(), colW - 84, 22, 600, 0.08, 13);
    parts.push(T(line.name.toUpperCase(), x + 68, y + capHeight(nameSize, 600) / 2, nameSize, 600, ink, { tracking: 0.08 }));
  });

  // --- footer
  parts.push(`<rect x="${PAD}" y="${footerY - 30}" width="${inner}" height="2" fill="${ink}" opacity="0.25"/>`);
  parts.push(T("INTERCHANGE", PAD, footerY, 18, 800, ink, { tracking: 0.16, opacity: 0.75 }));
  if (spec.motto) {
    const mSize = fitSize(spec.motto.toUpperCase(), inner * 0.42, 18, 600, 0.16, 11);
    parts.push(T(spec.motto.toUpperCase(), CANVAS.w / 2, footerY, mSize, 600, ink, { anchor: "middle", tracking: 0.16, opacity: 0.75 }));
  }
  parts.push(T(`NO. ${serialOf(spec)} / ONE OF ONE`, CANVAS.w - PAD, footerY, 18, 600, ink, { anchor: "end", tracking: 0.16, opacity: 0.75 }));

  return svgDoc(parts.join(""));
}

/* -------------------------------------------------------------------- back */

export function renderBack(spec: Spec): string {
  const garment = GARMENTS[spec.garment];
  const ink = garment.dark ? "#F5F2EA" : "#15161B";
  const parts: string[] = [];
  const inner = CANVAS.w - PAD * 2;
  const cx = CANVAS.w / 2;

  // Laid out from y = 0, then scaled as a block to fit the print area.
  let y = 0;
  parts.push(T("SERVICE INDEX", cx, y, 30, 800, ink, { anchor: "middle", tracking: 0.28 }));
  y += 36;
  const tSize = fitSize(spec.title, inner * 0.9, 26, 600, 0.12, 14);
  parts.push(T(spec.title, cx, y, tSize, 600, ink, { anchor: "middle", tracking: 0.12, opacity: 0.7 }));
  y += 44;
  parts.push(`<rect x="${cx - 170}" y="${n2(y)}" width="340" height="2.5" fill="${ink}" opacity="0.35"/>`);
  y += 74;

  for (const line of spec.lines) {
    const color = adaptColor(line.color, garment.dark);
    parts.push(`<rect x="${cx - 26}" y="${n2(y - 26)}" width="52" height="11" rx="5.5" fill="${color}"/>`);
    const nameSize = fitSize(line.name.toUpperCase(), inner * 0.8, 30, 800, 0.1, 16);
    parts.push(T(line.name.toUpperCase(), cx, y + 18, nameSize, 800, ink, { anchor: "middle", tracking: 0.1 }));
    y += 54;
    for (const st of line.stations) {
      const text = st.note ? `${st.label}  ·  ${st.note.toUpperCase()}` : st.label;
      const size = fitSize(text, inner * 0.86, 26, 600, 0.02, 14);
      parts.push(T(text, cx, y, size, 600, ink, { anchor: "middle", tracking: 0.02, opacity: 0.92 }));
      y += 40;
    }
    y += 36;
  }

  parts.push(`<rect x="${cx - 90}" y="${n2(y)}" width="180" height="2" fill="${ink}" opacity="0.3"/>`);
  y += 46;
  parts.push(
    T(`INTERCHANGE  ·  NO. ${serialOf(spec)}  ·  ONE OF ONE`, cx, y, 18, 600, ink, {
      anchor: "middle",
      tracking: 0.16,
      opacity: 0.7,
    }),
  );

  const top = 170;
  const avail = CANVAS.h - top * 2;
  const contentH = y + 20;
  const k = Math.min(1, avail / contentH);
  const offsetY = top + (avail - contentH * k) / 2;
  const body = `<g transform="translate(${n2(cx)} ${n2(offsetY)}) scale(${n2(k)}) translate(${n2(-cx)} 0)">${parts.join("")}</g>`;
  return svgDoc(body);
}

function svgDoc(body: string, px?: { w: number; h: number }): string {
  const w = px?.w ?? CANVAS.w;
  const h = px?.h ?? CANVAS.h;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${CANVAS.w} ${CANVAS.h}">` +
    body +
    `</svg>`
  );
}

/** Same artwork, emitted at an explicit pixel size for rasterising. */
export function atPixelSize(svg: string, w: number, h: number): string {
  return svg.replace(/^<svg([^>]*)width="\d+" height="\d+"/, `<svg$1width="${w}" height="${h}"`);
}
