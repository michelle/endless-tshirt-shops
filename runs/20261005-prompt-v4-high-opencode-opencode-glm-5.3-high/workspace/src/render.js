// Shared design renderer — one code path draws BOTH the customer's live preview
// and the 4677×5881 px (300 dpi) print file sent to Prodigi, so what they see
// is exactly what gets printed on the shirt.
// Runs in the browser (Canvas2D) and on the server (@napi-rs/canvas). No deps.

import { skyPositions, wallTimeToUtc, formatCoord, formatWhen } from "./astro.js";

const D2R = Math.PI / 180;

// Prodigi print area for GLOBAL-TEE-GIL-64000 (Gildan Softstyle) front, 300 dpi.
export const PRINT = { w: 4677, h: 5881 };

// ---- palette -------------------------------------------------------------
// Dark garments get warm "starlight" ink; light garments get deep navy ink.
const DARK_SHIRTS = new Set([
  "black", "navy blue", "charcoal", "dark chocolate", "dark heather grey",
  "maroon", "forest green", "royal blue", "sapphire blue", "purple",
]);
export function palette(shirtColor) {
  if (DARK_SHIRTS.has(shirtColor)) {
    return {
      light: true,
      ink: [245, 239, 226], // warm starlight white
      cool: [225, 236, 255], // hot blue-white stars
      warm: [255, 238, 205], // red giants
      line: [245, 239, 226],
    };
  }
  return {
    light: false,
    ink: [26, 32, 56], // deep night navy
    cool: [40, 62, 118],
    warm: [92, 66, 44],
    line: [26, 32, 56],
  };
}
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

// Star dot radius by magnitude, authored in print pixels.
export function starRadiusPx(mag) {
  const r = 0.0084 * Math.pow(10, 0.13 * (2.3 - mag));
  return Math.max(0.002, Math.min(0.0094, r)) * PRINT.w;
}
export function starTint(bv, pal) {
  if (bv === undefined || bv === null) return pal.ink;
  if (bv < 0) return mix(pal.ink, pal.cool, Math.min(1, -bv / 0.6) * 0.55);
  if (bv > 0.7) return mix(pal.ink, pal.warm, Math.min(1, (bv - 0.7) / 1.2) * 0.6);
  return pal.ink;
}

// ---- text with manual letter-spacing (identical in browser & skia) ---------
function measureSpaced(ctx, text, spacingPx) {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacingPx;
  return Math.max(0, w - spacingPx);
}
// shrink font size until the spaced text fits maxWidth (never below minSize)
function fitSpaced(ctx, text, family, baseSize, spacingEm, maxWidth, minSize) {
  let size = baseSize;
  for (let i = 0; i < 24; i++) {
    ctx.font = `400 ${size}px ${family}`;
    const spacing = size * spacingEm;
    if (measureSpaced(ctx, text, spacing) <= maxWidth || size <= minSize) {
      return { size, spacing };
    }
    size = Math.max(minSize, size * 0.94);
  }
  ctx.font = `400 ${size}px ${family}`;
  return { size, spacing: size * spacingEm };
}
function drawSpacedText(ctx, text, cx, baselineY, spacingPx, color, alpha = 1) {
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  const total = measureSpaced(ctx, text, spacingPx);
  let x = cx - total / 2;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  for (const ch of text) {
    ctx.fillText(ch, x, baselineY);
    x += ctx.measureText(ch).width + spacingPx;
  }
  ctx.globalAlpha = 1;
}

// ---- the design -----------------------------------------------------------
// opts: { width, height, color, title, message, place, dateStr, timeStr, tz,
//         lat, lon, showLines, stardata }
export function renderDesign(ctx, opts) {
  const W = opts.width;
  const H = opts.height;
  const u = W / PRINT.w; // scale from authored print pixels
  const pal = palette(opts.color);
  const P = (v) => v * u;

  ctx.clearRect(0, 0, W, H);

  const date = wallTimeToUtc(opts.dateStr, opts.timeStr, opts.tz);
  const sky = skyPositions({
    date,
    lat: opts.lat,
    lon: opts.lon,
    stars: opts.stardata.stars,
    constellations: opts.showLines ? opts.stardata.lines : null,
  });

  // layout (authored in print px)
  const cx = PRINT.w / 2;
  const cy = 2880;
  const R = 1650;

  // --- constellation lines
  if (sky.segs.length) {
    ctx.strokeStyle = rgba(pal.line, 0.34);
    ctx.lineWidth = P(13);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    for (const seg of sky.segs) {
      ctx.moveTo(cx + seg[0][0] * R * u, cy + seg[0][1] * R * u);
      for (let i = 1; i < seg.length; i++)
        ctx.lineTo(cx + seg[i][0] * R * u, cy + seg[i][1] * R * u);
    }
    ctx.stroke();
  }

  // --- stars (bright ones first so faint dots sit on top cleanly)
  for (const s of sky.pts) {
    const x = (cx + s.x * R) * u;
    const y = (cy + s.y * R) * u;
    const r = P(starRadiusPx(s.mag));
    const tint = starTint(s.bv, pal);
    if (s.mag < 2.0) {
      // soft halo for the brightest stars
      ctx.fillStyle = rgba(tint, 0.14);
      ctx.beginPath();
      ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(tint, 0.2);
      ctx.beginPath();
      ctx.arc(x, y, r * 1.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = rgba(tint, s.mag > 5 ? 0.85 : 1);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- frame: double ring + degree ticks + cardinal points
  ctx.strokeStyle = rgba(pal.ink, 1);
  ctx.lineWidth = P(16);
  ctx.beginPath();
  ctx.arc(P(cx), P(cy), P(R), 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = rgba(pal.ink, 0.55);
  ctx.lineWidth = P(5);
  ctx.beginPath();
  ctx.arc(P(cx), P(cy), P(R - 40), 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = rgba(pal.ink, 0.6);
  ctx.lineWidth = P(6);
  for (let k = 0; k < 72; k++) {
    const a = k * 5 * D2R;
    const cardinal = k % 18 === 0; // every 90°
    if (cardinal) continue; // letters live there
    const long = k % 3 === 0;
    const len = long ? 44 : 26;
    const r0 = R + 14;
    ctx.beginPath();
    ctx.moveTo(P(cx + Math.sin(a) * r0), P(cy - Math.cos(a) * r0));
    ctx.lineTo(P(cx + Math.sin(a) * (r0 + len)), P(cy - Math.cos(a) * (r0 + len)));
    ctx.stroke();
  }

  // cardinal letters (N top; E left — matches the look-up projection)
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `400 ${P(104)}px Jost`;
  ctx.fillStyle = rgba(pal.ink, 0.85);
  const card = R + 72;
  ctx.fillText("N", P(cx), P(cy - card));
  ctx.fillText("E", P(cx - card), P(cy));
  ctx.fillText("S", P(cx), P(cy + card));
  ctx.fillText("W", P(cx + card), P(cy));

  // --- typography
  const title = (opts.title || "").toUpperCase().slice(0, 30).trim();
  if (title) {
    const { size, spacing } = fitSpaced(
      ctx, title, "Cinzel", P(196), 0.26, P(PRINT.w * 0.82), P(88)
    );
    ctx.font = `400 ${size}px Cinzel`;
    drawSpacedText(ctx, title, P(cx), P(660), spacing, rgba(pal.ink, 0.96));
  }

  const when = formatWhen(opts.dateStr, opts.timeStr);
  const place = (opts.place || "").toUpperCase().slice(0, 48).trim();
  if (place && when) {
    const text = `${place} · ${when}`;
    const { size, spacing } = fitSpaced(
      ctx, text, "Jost", P(112), 0.16, P(PRINT.w * 0.88), P(68)
    );
    ctx.font = `400 ${size}px Jost`;
    drawSpacedText(ctx, text, P(cx), P(4820), spacing, rgba(pal.ink, 0.92));
  }

  {
    const { size, spacing } = fitSpaced(
      ctx, formatCoord(opts.lat, opts.lon), "Jost", P(88), 0.22, P(PRINT.w * 0.8), P(60)
    );
    ctx.font = `400 ${size}px Jost`;
    drawSpacedText(
      ctx, formatCoord(opts.lat, opts.lon), P(cx), P(5005), spacing, rgba(pal.ink, 0.62)
    );
  }

  const message = (opts.message || "").slice(0, 42).trim();
  if (message) {
    const { size, spacing } = fitSpaced(
      ctx, message, "Jost", P(104), 0.08, P(PRINT.w * 0.86), P(64)
    );
    ctx.font = `400 ${size}px Jost`;
    drawSpacedText(ctx, message, P(cx), P(5300), spacing, rgba(pal.ink, 0.88));
  }
}
