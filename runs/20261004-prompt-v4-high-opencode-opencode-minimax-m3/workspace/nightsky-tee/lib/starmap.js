// Star-map SVG generator for the NightSky Tee.
//
// Input:  a Date (UTC), observer latitude & longitude, and the optional
//         custom message + subtitle from the customer.
// Output: a self-contained SVG string. A separate rasterizer turns it
//         into a 4680x5790 PNG for the Prodigi print area of the
//         Bella + Canvas 3001 t-shirt.

import {
  STARS, CONSTELLATION_LINES, altAz, projectAltAz
} from "./astro.js";

// Each star's appearance is dictated by magnitude:
//   - radius scales with brightness
//   - color: bright stars get warm/yellow tint, faint stars get pure white
function starDotRadius(mag) {
  // mag 0 -> 26px, mag 4.5 -> ~3.5px (exponential falloff)
  const r = 32 * Math.pow(0.55, mag);
  const minR = 3.5;
  return Math.max(minR, r);
}

function starColor(mag) {
  // Rec. V-band color approximation for naked-eye stars.
  if (mag <  1.0) return "#ffe2a8";              // warm white  (Vega, Arcturus area)
  if (mag <  2.0) return "#fff5d8";
  if (mag <  3.0) return "#ffffff";
  return "#eef2ff";                              // faintly blue for the bulk
}

// Render an SVG star map.
//
//   opts = {
//     date:           Date (the moment the customer picked)
//     lat, lon:       observer location
//     whereLabel:     e.g. "Rome, Italy"
//     messageTitle:   e.g. "The night we met"
//     messageSub:     e.g. "It was the best of times"
//     dateLabel:      e.g. "14 June 2024 · 22:34"
//     shirtColor:     "black" | "navy" | "charcoal"
//     teePrintId:     short id (printed tiny on the back)
//     layout:         "portrait" | "square"   (portrait = 4680x5790)
//   }
export function renderStarmapSVG(opts) {
  const {
    date, lat, lon,
    whereLabel      = "Your Special Place",
    messageTitle    = "Your Moment in the Sky",
    messageSub      = "",
    shirtColor      = "black",
    layout          = "portrait"
  } = opts;

  // -------- canvas dims ------------------------------------------------
  const W = layout === "portrait" ? 4680 : 4000;
  const H = layout === "portrait" ? 5790 : 4000;

  // background gradient
  const bg = shirtColor === "navy"
    ? { from: "#0a1024", to: "#04060f" }
    : shirtColor === "charcoal"
      ? { from: "#1a1c20", to: "#0d0e10" }
      : { from: "#0d0d18", to: "#000000" };

  // -------- star projection --------------------------------------------
  const jd = (() => {
    const Y = date.getUTCFullYear();
    const M = date.getUTCMonth() + 1;
    const D = date.getUTCDate()
      + date.getUTCHours() / 24
      + date.getUTCMinutes() / (24 * 60)
      + date.getUTCSeconds() / (24 * 60 * 60);
    let y, m;
    if (M <= 2) { y = Y - 1; m = M + 12; } else { y = Y; m = M; }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25*(y+4716)) + Math.floor(30.6001*(m+1)) + D + B - 1524.5;
  })();

  // Star-face geometry. For portrait: circle centered high; text below.
  const cx = W / 2;
  const skyRadius = 1700;
  const skyCy    = layout === "portrait" ? 1850 : W / 2;

  // Things low-altitude (alt<8°) get their glow dimmed; otherwise the
  // glow haloes bleed past the horizon ring.
  const LOW_ALT = 8;

  const starParts = [];
  const lineParts = [];

  // First pass: build a star->xy map so we can connect lines.
  const starXY = new Map(); // id -> [x, y, alt, az]
  for (const s of STARS) {
    const { alt, az } = altAz(s.ra, s.dec, jd, lat, lon);
    const xy = projectAltAz(alt, az, skyRadius, -3); // slight below-horizon clipping
    if (!xy) continue;
    starXY.set(s.id, [xy[0], xy[1], alt, az]);
  }

  // Constellation linework.
  for (const con of CONSTELLATION_LINES) {
    for (const [a, b] of con.lines) {
      const pa = starXY.get(a), pb = starXY.get(b);
      if (!pa || !pb) continue;
      // Both stars must be well above horizon
      if (pa[2] < 5 || pb[2] < 5) continue;
      const fade = Math.pow(((pa[2] + pb[2]) / 2) / 60, 0.7);
      lineParts.push(`<line x1="${(cx+pa[0]).toFixed(1)}" y1="${(skyCy+pa[1]).toFixed(1)}"
                x2="${(cx+pb[0]).toFixed(1)}" y2="${(skyCy+pb[1]).toFixed(1)}"
                stroke="#d8c8ff" stroke-opacity="${(0.55*fade).toFixed(2)}"
                stroke-width="5.5" stroke-linecap="round"
                stroke-dasharray="0" />`);
    }
  }

  // Stars on top.
  for (const s of STARS) {
    const xy = starXY.get(s.id);
    if (!xy) continue;
    const [x, y, alt] = xy;
    const r = starDotRadius(s.mag);
    const col = starColor(s.mag);
    const lowFactor = alt < LOW_ALT ? alt / LOW_ALT : 1;       // 0..1
    // A faint shimmer ONLY for the brightest stars, attenuated near horizon.
    if (s.mag < 1.8) {
      const glow = 0.045 * lowFactor;
      starParts.push(
        `<circle cx="${(cx+x).toFixed(1)}" cy="${(skyCy+y).toFixed(1)}"
                 r="${(r*7).toFixed(1)}" fill="${col}" fill-opacity="${glow.toFixed(2)}" />`
      );
    }
    starParts.push(
      `<circle cx="${(cx+x).toFixed(1)}" cy="${(skyCy+y).toFixed(1)}"
               r="${r.toFixed(1)}" fill="${col}" />`
    );
    // Crisp diffraction spikes for named bright stars only
    if (s.mag < 2.0 && s.name) {
      const spike = Math.max(60, r * 9);
      starParts.push(`<g stroke="${col}" stroke-opacity="${(0.40*lowFactor).toFixed(2)}" stroke-width="2.2" stroke-linecap="round">
        <line x1="${(cx+x-spike).toFixed(1)}" y1="${(skyCy+y).toFixed(1)}"
              x2="${(cx+x+spike).toFixed(1)}" y2="${(skyCy+y).toFixed(1)}" />
        <line x1="${(cx+x).toFixed(1)}" y1="${(skyCy+y-spike).toFixed(1)}"
              x2="${(cx+x).toFixed(1)}" y2="${(skyCy+y+spike).toFixed(1)}" />
      </g>`);
    }
  }

  // Cardinal direction labels around the horizon ring.
  const cardinals = [
    { label: "N", az:   0 },
    { label: "E", az:  90 },
    { label: "S", az: 180 },
    { label: "W", az: 270 },
  ].map(c => {
    const a = c.az * Math.PI / 180;
    const rx = skyRadius * 1.07;
    const ry = skyRadius * 1.07;
    return {
      label: c.label,
      x: cx + rx * Math.sin(a),
      y: skyCy - ry * Math.cos(a)
    };
  });

  const cardinalSvg = cardinals.map(c => `
    <text x="${c.x.toFixed(0)}" y="${c.y.toFixed(0)}"
          text-anchor="middle" dominant-baseline="central"
          font-family="Georgia, 'Times New Roman', serif"
          font-size="74" font-weight="500"
          fill="#bdb6e3" fill-opacity="0.92"
          letter-spacing="6">${c.label}</text>
  `).join("");

  // Decorative background star field (deterministic so re-renders stay stable).
  // mulberry32
  function rand(seed) {
    let t = seed;
    return () => {
      t = (t + 0x6D2B79F5) | 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = r + Math.imul(r ^ (r >>> 7), 61 | r) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  const r = rand(hashStr(`${lat}|${lon}|${date.toISOString()}`));
  const bgStars = [];
  for (let i = 0; i < 220; i++) {
    const x = r() * W;
    const y = r() * (layout === "portrait" ? skyCy - 80 : H);
    const rad = (0.7 + r() * 2.3).toFixed(1);
    const op  = (0.20 + r() * 0.55).toFixed(2);
    bgStars.push(
      `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}"
               r="${rad}" fill="#ffffff" fill-opacity="${op}" />`
    );
  }

  // -------- typography block ------------------------------------------
  const titleSize    = Math.round(W * 0.058);   // ~270
  const subtitleSize = Math.round(W * 0.024);
  const metaSize     = Math.round(W * 0.019);
  const brandSize    = Math.round(W * 0.014);

  // font-color: cream for dark shirts
  const inkPrimary   = shirtColor === "navy" ? "#f6f1e3" : "#f1ead2";
  const inkSecondary = shirtColor === "navy" ? "#b8b1c4" : "#c9c1e2";
  const inkAccent    = shirtColor === "navy" ? "#9d8c5e" : "#a88c4e";

  // y positions for each line, well spaced.
  const ySubTitle   = layout === "portrait" ? 4180 : (H + 100);
  const yTitle      = ySubTitle - titleSize - 130;
  const yDivider    = layout === "portrait" ? ySubTitle + Math.round(titleSize*0.42) + 250 : 0;
  const yWhere      = layout === "portrait" ? yDivider + 360 : (H * 0.78);
  const yWhen       = layout === "portrait" ? yWhere + subtitleSize + 140 : yWhere + metaSize + 120;
  const yBrand      = layout === "portrait" ? H - 260 : (H * 0.93);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"
     width="${W}" height="${H}">
  <defs>
    <radialGradient id="sky" cx="50%" cy="50%" r="60%">
      <stop offset="0%"  stop-color="${bg.from}"/>
      <stop offset="100%" stop-color="${bg.to}"/>
    </radialGradient>
  </defs>

  <!-- background -->
  <rect width="${W}" height="${H}" fill="url(#sky)" />

  <!-- decorative star field (deterministic) -->
  ${bgStars.join("\n  ")}

  <!-- horizon ring -->
  <circle cx="${cx}" cy="${skyCy}" r="${skyRadius}"
          fill="none" stroke="#564f7c" stroke-opacity="0.55" stroke-width="3.5"/>
  <circle cx="${cx}" cy="${skyCy}" r="${(skyRadius*1.03).toFixed(1)}"
          fill="none" stroke="#564f7c" stroke-opacity="0.22" stroke-width="1.6"/>

  <!-- constellation lines -->
  ${lineParts.join("\n  ")}

  <!-- stars -->
  ${starParts.join("\n  ")}

  <!-- cardinal directions -->
  ${cardinalSvg}

  ${layout === "portrait" ? `
  <!-- divider -->
  <line x1="${(W*0.20).toFixed(0)}" y1="${yDivider}"
        x2="${(W*0.80).toFixed(0)}" y2="${yDivider}"
        stroke="${inkAccent}" stroke-opacity="0.55" stroke-width="3.5"/>
  ` : ""}

  <!-- title -->
  <text x="${cx}" y="${yTitle}"
        text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${titleSize}"
        font-weight="600"
        fill="${inkPrimary}"
        letter-spacing="2">${escapeXml(truncate(messageTitle, 32))}</text>

  ${messageSub ? `
  <text x="${cx}" y="${ySubTitle}"
        text-anchor="middle"
        font-family="Georgia, serif"
        font-style="italic"
        font-size="${Math.round(titleSize*0.42)}"
        fill="${inkSecondary}"
        letter-spacing="1.5">${escapeXml(truncate(messageSub, 60))}</text>
  ` : ""}

  <!-- where -->
  <text x="${cx}" y="${yWhere}"
        text-anchor="middle"
        font-family="Georgia, serif"
        font-size="${subtitleSize}"
        fill="${inkPrimary}"
        letter-spacing="6"
        font-weight="400">${escapeXml(whereLabel.toUpperCase())}</text>

  <!-- when -->
  <text x="${cx}" y="${yWhere + subtitleSize + 100}"
        text-anchor="middle"
        font-family="Georgia, serif"
        font-size="${metaSize}"
        fill="${inkSecondary}"
        letter-spacing="3">${escapeXml(dateLabelFor(date))}</text>

  <!-- branding -->
  <text x="${cx}" y="${yBrand}"
        text-anchor="middle"
        font-family="Georgia, serif"
        font-size="${brandSize}"
        fill="${inkSecondary}"
        fill-opacity="0.65"
        letter-spacing="14">NIGHTSKY · TEE</text>
</svg>`;
}

// ----------------- helpers ----------------------------------------------

function escapeXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "?");  // strip unseen control chars
}

function truncate(s, n) {
  s = String(s || "").trim();
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

// Render UTC and site-local-style label for a Date.
function dateLabelFor(d) {
  const DD = d.getUTCDate().toString().padStart(2, "0");
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const M = months[d.getUTCMonth()];
  const Y = d.getUTCFullYear();
  const hh = d.getUTCHours().toString().padStart(2, "0");
  const mm = d.getUTCMinutes().toString().padStart(2, "0");
  return `${DD} ${M} ${Y}  ·  ${hh}:${mm} UTC`;
}

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}
