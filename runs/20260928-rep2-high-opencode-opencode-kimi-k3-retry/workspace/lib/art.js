// ONE OF ONE generative art engine.
// Isomorphic: runs in the browser (SVG preview) and on the server (sharp -> PNG print file).
// Deterministic: same (word, palette) always grows the same artwork.

import { rngFromString, editionHash } from "./rng.js";
import { getPalette } from "./palettes.js";

export const ART_W = 1200;
export const ART_H = 1484; // matches Bella+Canvas 3001 print area ratio 15.6" x 19.3"

const TAU = Math.PI * 2;

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// Build a seeded flow-field angle function.
function makeField(rng, style) {
  const f1 = 0.0018 + rng() * 0.0032;
  const f2 = 0.0018 + rng() * 0.0032;
  const f3 = 0.0009 + rng() * 0.0022;
  const p1 = rng() * TAU;
  const p2 = rng() * TAU;
  const p3 = rng() * TAU;
  const s1 = 0.9 + rng() * 0.9;
  const s2 = 0.9 + rng() * 0.9;
  const s3 = 0.5 + rng() * 0.9;
  const dx1 = Math.cos(rng() * TAU);
  const dy1 = Math.sin(rng() * TAU);
  const cx = ART_W * (0.42 + rng() * 0.16);
  const cy = ART_H * (0.42 + rng() * 0.16);
  const vortexDir = rng() < 0.5 ? 1 : -1;
  const ringFreq = 0.008 + rng() * 0.014;

  let fn;
  switch (style) {
    case "rings":
      fn = (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.sqrt(dx * dx + dy * dy) + 1e-6;
        const swirl = Math.atan2(dy, dx) + (Math.PI / 2) * vortexDir;
        return (
          swirl +
          0.55 * Math.sin(d * ringFreq + p1) +
          0.35 * s3 * Math.sin(x * f3 + p3)
        );
      };
      break;
    case "bloom":
      fn = (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.sqrt(dx * dx + dy * dy) + 1e-6;
        const outward = Math.atan2(dy, dx);
        const wobble =
          s1 * Math.sin(x * dx1 * f1 + p1) + s2 * Math.cos(y * dy1 * f2 + p2);
        return outward + 0.85 * Math.sin(wobble + d * 0.002 + p3);
      };
      break;
    case "current":
      fn = (x, y) => {
        return (
          (rng.currentDir ?? 0) +
          s1 * 0.75 * Math.sin(y * f1 * 1.6 + p1) +
          s2 * 0.45 * Math.sin((x * 0.4 + y) * f3 + p3)
        );
      };
      break;
    case "tangle":
    default:
      fn = (x, y) =>
        s1 * Math.sin(x * dx1 * f1 + y * dy1 * f1 + p1) +
        s2 * Math.cos(x * f2 * -dy1 + y * f2 * dx1 + p2) +
        s3 * Math.sin((x * dx1 + y * dy1) * f3 + p3);
  }
  return { fn, cx, cy };
}

// One flowing stroke walking the field.
function traceStroke(field, x, y, steps, stepLen, drift = 0) {
  const pts = [];
  let px = x;
  let py = y;
  let prev = null;
  for (let i = 0; i < steps; i++) {
    pts.push([px, py]);
    let a = field(px, py);
    if (prev !== null) {
      // momentum: smooth turns, more organic line
      let d = a - prev;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      a = prev + d * 0.62;
    }
    a += drift;
    prev = a;
    px += Math.cos(a) * stepLen;
    py += Math.sin(a) * stepLen;
    if (px < -120 || px > ART_W + 120 || py < -120 || py > ART_H + 120) break;
  }
  return pts;
}

function pathFrom(pts) {
  if (pts.length < 2) return null;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    d += `L${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)}`;
  }
  return d;
}

export function generateArt(word, paletteId) {
  const cleanWord = (word || "").trim().slice(0, 40) || "nameless";
  const palette = getPalette(paletteId);
  const seedStr = `${cleanWord.toLowerCase()}::${palette.id}::v1`;
  const rng = rngFromString(seedStr);

  const style = pick(rng, ["tangle", "rings", "bloom", "current"]);
  rng.currentDir = (rng() - 0.5) * 0.5; // used only by "current"

  const fieldObj = makeField(rng, style);
  const field = fieldObj.fn;

  // Art direction: 2 dominant inks + 1 accent keeps each piece cohesive.
  const inks = [...palette.inks];
  const domA = inks.splice(Math.floor(rng() * inks.length), 1)[0];
  const domB = inks.splice(Math.floor(rng() * inks.length), 1)[0];
  const accent = inks.splice(Math.floor(rng() * inks.length), 1)[0];

  // Spawn region. rings/bloom orbit their field center; tangle/current use an
  // organic blob slightly above the vertical center (sits right on a chest print).
  const centered = style === "rings" || style === "bloom";
  const ccx = centered ? fieldObj.cx : ART_W * (0.44 + rng() * 0.12);
  const ccy = centered ? fieldObj.cy : ART_H * (0.44 + rng() * 0.12);
  const R =
    Math.min(ART_W, ART_H) * (centered ? 0.36 + rng() * 0.08 : 0.34 + rng() * 0.1);
  const lobes = 2 + Math.floor(rng() * 3);
  const lobePhase = rng() * TAU;
  const lobeAmp = centered ? 0.3 : 0.22;

  function spawn() {
    if (style === "current") {
      // horizontal band across the whole print: suits the sideways flow
      const x = -20 + rng() * (ART_W + 40);
      const spread = Math.sign(rng() - 0.5) * Math.pow(rng(), 0.6);
      const y = ccy + spread * R * 1.05;
      return [x, y];
    }
    const t = rng() * TAU;
    const wob = 1 + lobeAmp * Math.sin(t * lobes + lobePhase);
    const r = R * wob * Math.sqrt(rng());
    return [ccx + Math.cos(t) * r, ccy + Math.sin(t) * r * 1.12];
  }

  const parts = [];
  const emit = (d, color, width, opacity) =>
    parts.push(
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width.toFixed(
        2
      )}" stroke-opacity="${opacity.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`
    );

  const inkFor = () => {
    const r = rng();
    if (r < 0.14) return accent;
    return rng() < 0.5 ? domA : domB;
  };

  // Layer 1: wash — long, faint underpainting
  const washN = 80 + Math.floor(rng() * 40);
  for (let i = 0; i < washN; i++) {
    const [x, y] = spawn();
    const pts = traceStroke(field, x, y, 110 + Math.floor(rng() * 90), 3.4);
    const d = pathFrom(pts);
    if (d) emit(d, rng() < 0.7 ? domA : domB, 5 + rng() * 9, 0.07 + rng() * 0.07);
  }

  // Layer 2: flow — the body of the piece
  const flowN = 520 + Math.floor(rng() * 220);
  for (let i = 0; i < flowN; i++) {
    const [x, y] = spawn();
    const pts = traceStroke(field, x, y, 40 + Math.floor(rng() * 55), 2.5);
    const d = pathFrom(pts);
    if (d) emit(d, inkFor(), 1.3 + rng() * 2.1, 0.3 + rng() * 0.35);
  }

  // Layer 3: detail — short bright accents
  const detN = 380 + Math.floor(rng() * 160);
  for (let i = 0; i < detN; i++) {
    const [x, y] = spawn();
    const pts = traceStroke(field, x, y, 14 + Math.floor(rng() * 26), 1.7);
    const d = pathFrom(pts);
    if (d) emit(d, rng() < 0.35 ? accent : inkFor(), 0.7 + rng() * 1.1, 0.45 + rng() * 0.4);
  }

  const edition = editionHash(seedStr);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ART_W} ${ART_H}" width="${ART_W}" height="${ART_H}">${parts.join("")}</svg>`;

  return { svg, edition, style, palette, word: cleanWord, seedStr };
}
