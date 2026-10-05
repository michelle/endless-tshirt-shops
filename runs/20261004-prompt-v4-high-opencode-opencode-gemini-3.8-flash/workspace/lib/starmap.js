// lib/starmap.js
// High-resolution SVG & PNG star map generator for custom DTG t-shirts.
// 4680 x 5790 native canvas resolution for Bella + Canvas 3001.

import { Resvg } from "@resvg/resvg-js";
import {
  STARS, CONSTELLATIONS, julianDate, altAz, projectAltAz
} from "./astro.js";

function escapeXml(unsafe) {
  return String(unsafe ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatCoords(lat, lon) {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  const latAbs = Math.abs(lat);
  const lonAbs = Math.abs(lon);
  const latDeg = Math.floor(latAbs);
  const latMin = Math.floor((latAbs - latDeg) * 60);
  const lonDeg = Math.floor(lonAbs);
  const lonMin = Math.floor((lonAbs - lonDeg) * 60);
  return `${latDeg}°${latMin}'${latDir} · ${lonDeg}°${lonMin}'${lonDir}`;
}

function formatDate(date) {
  const months = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];
  const m = months[date.getUTCMonth()];
  const d = date.getUTCDate();
  const y = date.getUTCFullYear();
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  return `${m} ${d}, ${y} · ${h}:${min} UTC`;
}

export function renderStarmapSVG(opts = {}) {
  const {
    date = new Date(),
    lat = 40.7128,
    lon = -74.0060,
    whereLabel = "New York, USA",
    messageTitle = "THE NIGHT WE MET",
    messageSub = "Underneath the autumn sky",
    shirtColor = "black"
  } = opts;

  const W = 4680;
  const H = 5790;

  // Celestial Disc geometry
  const cx = W / 2;
  const skyRadius = 1680;
  const skyCy = 2050;

  // Palette tuned to garment color
  let cosmicDiscFrom, cosmicDiscMid, cosmicDiscTo;
  let inkPrimary = "#f7f1e1";
  let inkSecondary = "#d5ccba";
  let inkAccent = "#c5a467";
  let ringStroke = "#7e88b8";
  let lineStroke = "#a3b2ea";

  if (shirtColor === "navy" || shirtColor === "navy blue") {
    cosmicDiscFrom = "#131c3f";
    cosmicDiscMid = "#0a1027";
    cosmicDiscTo = "#030612";
    inkPrimary = "#fbf6ec";
    inkSecondary = "#c8d0e7";
    inkAccent = "#b89758";
    ringStroke = "#8696d4";
    lineStroke = "#b0c2fc";
  } else if (shirtColor === "asphalt" || shirtColor === "dark heather grey") {
    cosmicDiscFrom = "#1c202b";
    cosmicDiscMid = "#11141c";
    cosmicDiscTo = "#080a0e";
    inkPrimary = "#f6f2e8";
    inkSecondary = "#c9c5bd";
    inkAccent = "#bda069";
    ringStroke = "#888ea4";
    lineStroke = "#abb2cc";
  } else {
    // Standard pure black
    cosmicDiscFrom = "#10162e";
    cosmicDiscMid = "#070b1a";
    cosmicDiscTo = "#020308";
  }

  const jd = julianDate(date);

  // Compute Alt/Az for stars and project onto disc
  const starXY = new Map();
  for (const s of STARS) {
    const { alt, az } = altAz(s.ra, s.dec, jd, lat, lon);
    const xy = projectAltAz(alt, az, skyRadius, -2); // allow slightly touching horizon
    if (xy) {
      starXY.set(s.id, { x: xy[0], y: xy[1], alt, az, star: s });
    }
  }

  // Constellation connector lines
  const constellationSvgs = [];
  for (const con of CONSTELLATIONS) {
    for (const [idA, idB] of con.lines) {
      const a = starXY.get(idA);
      const b = starXY.get(idB);
      if (a && b && a.alt > 2 && b.alt > 2) {
        const x1 = (cx + a.x).toFixed(1);
        const y1 = (skyCy + a.y).toFixed(1);
        const x2 = (cx + b.x).toFixed(1);
        const y2 = (skyCy + b.y).toFixed(1);
        const avgAlt = (a.alt + b.alt) / 2;
        const opacity = Math.min(0.55, 0.2 + (avgAlt / 90) * 0.35).toFixed(2);
        constellationSvgs.push(
          `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${lineStroke}" stroke-width="4.5" stroke-opacity="${opacity}" stroke-linecap="round"/>`
        );
      }
    }
  }

  // Star points & flares
  const starSvgs = [];
  const nameSvgs = [];
  for (const item of starXY.values()) {
    const s = item.star;
    const x = (cx + item.x).toFixed(1);
    const y = (skyCy + item.y).toFixed(1);

    // Magnitude to radius formula
    let r = Math.max(3.5, 34 * Math.pow(0.56, s.mag));
    let color = "#ffffff";
    if (s.mag < 0.2) color = "#fff2d6";
    else if (s.mag < 1.2) color = "#fffae8";
    else if (s.mag < 2.5) color = "#f0f4ff";

    // Bright star soft glowing halo
    if (s.mag < 1.5 && item.alt > 6) {
      const glowR = (r * 6).toFixed(1);
      starSvgs.push(
        `<circle cx="${x}" cy="${y}" r="${glowR}" fill="${color}" fill-opacity="0.12"/>`
      );
    }

    // 4-point diffraction spike for brightest first-magnitude stars
    if (s.mag < 1.1 && item.alt > 10) {
      const spikeLen = Math.max(50, r * 8).toFixed(1);
      const spikeW = (r * 0.45).toFixed(1);
      starSvgs.push(
        `<polygon points="${x},${Number(y) - Number(spikeLen)} ${(Number(x) + Number(spikeW)).toFixed(1)},${y} ${x},${(Number(y) + Number(spikeLen)).toFixed(1)} ${(Number(x) - Number(spikeW)).toFixed(1)},${y}" fill="${color}" fill-opacity="0.7"/>`
      );
      starSvgs.push(
        `<polygon points="${Number(x) - Number(spikeLen)},${y} ${x},${(Number(y) + Number(spikeW)).toFixed(1)} ${(Number(x) + Number(spikeLen)).toFixed(1)},${y} ${x},${(Number(y) - Number(spikeW)).toFixed(1)}" fill="${color}" fill-opacity="0.7"/>`
      );
    }

    // Core star dot
    starSvgs.push(
      `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="${color}" fill-opacity="0.95"/>`
    );

    // Label for top named stars
    if (s.name && s.mag < 1.6 && item.alt > 12) {
      const labelX = (Number(x) + 22).toFixed(1);
      const labelY = (Number(y) + 12).toFixed(1);
      nameSvgs.push(
        `<text x="${labelX}" y="${labelY}" font-family="Georgia, serif" font-size="36" fill="${inkSecondary}" fill-opacity="0.75" letter-spacing="2">${escapeXml(s.name.toUpperCase())}</text>`
      );
    }
  }

  // Altitude grid rings (30° and 60°)
  const r30 = (skyRadius * (60 / 90)).toFixed(1);
  const r60 = (skyRadius * (30 / 90)).toFixed(1);

  // Compass cardinal markers
  const cardinals = [
    { label: "N", angle: 0 },
    { label: "E", angle: 90 },
    { label: "S", angle: 180 },
    { label: "W", angle: 270 }
  ];
  const cardinalSvgs = cardinals.map(c => {
    const rad = (c.angle * Math.PI) / 180;
    const cardR = skyRadius + 65;
    const cardX = (cx + cardR * Math.sin(rad)).toFixed(1);
    const cardY = (skyCy - cardR * Math.cos(rad) + 24).toFixed(1);
    return `<text x="${cardX}" y="${cardY}" text-anchor="middle" font-family="Georgia, serif" font-size="70" font-weight="600" fill="${ringStroke}" letter-spacing="4">${c.label}</text>`;
  });

  // Perimeter degree tick marks (every 10 degrees)
  const ticks = [];
  for (let deg = 0; deg < 360; deg += 10) {
    const isMajor = deg % 30 === 0;
    const rad = (deg * Math.PI) / 180;
    const tickLen = isMajor ? 28 : 14;
    const rStart = skyRadius;
    const rEnd = skyRadius - tickLen;
    const x1 = (cx + rStart * Math.sin(rad)).toFixed(1);
    const y1 = (skyCy - rStart * Math.cos(rad)).toFixed(1);
    const x2 = (cx + rEnd * Math.sin(rad)).toFixed(1);
    const y2 = (skyCy - rEnd * Math.cos(rad)).toFixed(1);
    const strokeW = isMajor ? 3 : 1.5;
    const op = isMajor ? 0.6 : 0.35;
    ticks.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ringStroke}" stroke-width="${strokeW}" stroke-opacity="${op}"/>`
    );
  }

  // Ambient dust stars inside the disc (seeded deterministic)
  const dustSvgs = [];
  let seed = Math.abs(Math.sin(lat) * 100000 + Math.cos(lon) * 10000 + date.getTime() % 100000);
  function rand() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  for (let i = 0; i < 280; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = Math.sqrt(rand()) * (skyRadius - 40);
    const dx = (cx + dist * Math.cos(angle)).toFixed(1);
    const dy = (skyCy + dist * Math.sin(angle)).toFixed(1);
    const rad = (0.8 + rand() * 2.2).toFixed(1);
    const op = (0.2 + rand() * 0.55).toFixed(2);
    dustSvgs.push(
      `<circle cx="${dx}" cy="${dy}" r="${rad}" fill="#ffffff" fill-opacity="${op}"/>`
    );
  }

  const coordsText = formatCoords(lat, lon);
  const dateText = formatDate(date);
  const locationText = String(whereLabel || "EARTH").toUpperCase();

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <!-- Celestial Disc Gradient -->
    <radialGradient id="cosmic-disc" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${cosmicDiscFrom}"/>
      <stop offset="65%" stop-color="${cosmicDiscMid}"/>
      <stop offset="100%" stop-color="${cosmicDiscTo}"/>
    </radialGradient>

    <!-- Clip Path for the celestial circle -->
    <clipPath id="sky-clip">
      <circle cx="${cx}" cy="${skyCy}" r="${skyRadius}"/>
    </clipPath>
  </defs>

  <!-- NOTE: Outer canvas is TRANSPARENT so t-shirt fabric is the backdrop! -->

  <!-- Celestial Disc Background -->
  <circle cx="${cx}" cy="${skyCy}" r="${skyRadius}" fill="url(#cosmic-disc)"/>

  <!-- Star Content Clipped to Disc -->
  <g clip-path="url(#sky-clip)">
    <!-- Altitude Grid Circles -->
    <circle cx="${cx}" cy="${skyCy}" r="${r30}" fill="none" stroke="${ringStroke}" stroke-width="2" stroke-opacity="0.22" stroke-dasharray="14 10"/>
    <circle cx="${cx}" cy="${skyCy}" r="${r60}" fill="none" stroke="${ringStroke}" stroke-width="2" stroke-opacity="0.22" stroke-dasharray="14 10"/>
    
    <!-- Zenith Crosshair -->
    <line x1="${cx - 30}" y1="${skyCy}" x2="${cx + 30}" y2="${skyCy}" stroke="${ringStroke}" stroke-width="2" stroke-opacity="0.35"/>
    <line x1="${cx}" y1="${skyCy - 30}" x2="${cx}" y2="${skyCy + 30}" stroke="${ringStroke}" stroke-width="2" stroke-opacity="0.35"/>

    <!-- Ambient Dust Stars -->
    ${dustSvgs.join("\n    ")}

    <!-- Constellation Lines -->
    ${constellationSvgs.join("\n    ")}

    <!-- Star Points & Halos -->
    ${starSvgs.join("\n    ")}

    <!-- Star Labels -->
    ${nameSvgs.join("\n    ")}
  </g>

  <!-- Horizon Border Rings & Coordinate Markings -->
  <circle cx="${cx}" cy="${skyCy}" r="${skyRadius}" fill="none" stroke="${ringStroke}" stroke-width="4.5" stroke-opacity="0.75"/>
  <circle cx="${cx}" cy="${skyCy}" r="${skyRadius - 28}" fill="none" stroke="${ringStroke}" stroke-width="2" stroke-opacity="0.4"/>
  <circle cx="${cx}" cy="${skyCy + 0}" r="${skyRadius + 14}" fill="none" stroke="${ringStroke}" stroke-width="1.5" stroke-opacity="0.3"/>

  <!-- Compass Cardinal Letters & Ticks -->
  ${ticks.join("\n  ")}
  ${cardinalSvgs.join("\n  ")}

  <!-- ================= TYPOGRAPHY & DEDICATION BLOCK ================= -->

  <!-- Top Ornamental Divider -->
  <line x1="${cx - 750}" y1="4120" x2="${cx - 60}" y2="4120" stroke="${inkAccent}" stroke-width="3" stroke-opacity="0.65"/>
  <polygon points="${cx},4112 ${cx + 12},4120 ${cx},4128 ${cx - 12},4120" fill="${inkAccent}"/>
  <line x1="${cx + 60}" y1="4120" x2="${cx + 750}" y2="4120" stroke="${inkAccent}" stroke-width="3" stroke-opacity="0.65"/>

  <!-- Primary Title -->
  <text x="${cx}" y="4370" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="200" font-weight="700" fill="${inkPrimary}" letter-spacing="10">${escapeXml(messageTitle.toUpperCase())}</text>

  <!-- Custom Dedication Subtitle -->
  ${messageSub ? `<text x="${cx}" y="4560" text-anchor="middle" font-family="Georgia, serif" font-size="94" font-style="italic" fill="${inkSecondary}" letter-spacing="3">${escapeXml(messageSub)}</text>` : ""}

  <!-- Location Name & Geographic Coordinates -->
  <text x="${cx}" y="4820" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" font-size="72" font-weight="600" fill="${inkSecondary}" letter-spacing="8">${escapeXml(locationText)}</text>
  <text x="${cx}" y="4940" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" font-size="62" font-weight="400" fill="${inkSecondary}" fill-opacity="0.8" letter-spacing="6">${escapeXml(coordsText)}</text>

  <!-- Precise Timestamp -->
  <text x="${cx}" y="5100" text-anchor="middle" font-family="Georgia, serif" font-size="66" font-style="italic" fill="${inkAccent}" letter-spacing="5">${escapeXml(dateText)}</text>

  <!-- Bottom Brand & Concept Line -->
  <line x1="${cx - 300}" y1="5320" x2="${cx + 300}" y2="5320" stroke="${inkSecondary}" stroke-width="1.5" stroke-opacity="0.35"/>
  <text x="${cx}" y="5410" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" font-size="44" font-weight="500" fill="${inkSecondary}" fill-opacity="0.5" letter-spacing="10">CELESTIA · ASTRONOMICAL CUSTOM SHIRTS</text>
</svg>`;
}

// Render to high-resolution PNG Buffer via Resvg
export function renderStarmapPNG(opts = {}) {
  const svg = renderStarmapSVG(opts);
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: 4680
    },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: "Georgia"
    }
  });
  const pngData = resvg.render();
  return pngData.asPng();
}
