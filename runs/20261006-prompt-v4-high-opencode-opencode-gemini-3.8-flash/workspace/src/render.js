import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import path from 'node:path';
import { ASSETS_DIR } from './config.js';
import { CATALOG } from './catalog.js';
import { STARS, CONSTELLATIONS, calculateLST, projectStar, getBackgroundStars } from './stars.js';

// Register fonts
try {
  GlobalFonts.registerFromPath(path.join(ASSETS_DIR, 'fonts', 'JetBrainsMono-Regular.ttf'), 'JetBrainsMono');
  GlobalFonts.registerFromPath(path.join(ASSETS_DIR, 'fonts', 'JetBrainsMono-ExtraBold.ttf'), 'JetBrainsMonoBold');
  GlobalFonts.registerFromPath(path.join(ASSETS_DIR, 'fonts', 'Chivo-Medium.ttf'), 'Chivo');
} catch (err) {
  console.warn('Font registration notice:', err.message);
}

const PRINT_WIDTH = 4680;
const PRINT_HEIGHT = 5790;

/**
 * Format date nicely, e.g. "OCTOBER 14, 2024 • 21:00 UTC"
 */
function formatDateLabel(dateStr, timeStr) {
  try {
    const d = new Date(`${dateStr}T${timeStr}:00Z`);
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const month = months[d.getUTCMonth()];
    const day = d.getUTCDate();
    const year = d.getUTCFullYear();
    const time = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    return `${month} ${day}, ${year} • ${time} UTC`;
  } catch {
    return `${dateStr.toUpperCase()} • ${timeStr} UTC`;
  }
}

/**
 * Format coordinates, e.g. "37.7749° N, 122.4194° W — SAN FRANCISCO, CA"
 */
function formatCoordLabel(lat, lon, locationName) {
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lonStr} — ${locationName}`;
}

export function renderDesign(design, options = {}) {
  const targetWidth = options.width || PRINT_WIDTH;
  const scale = targetWidth / PRINT_WIDTH;
  const targetHeight = Math.round(PRINT_HEIGHT * scale);

  const canvas = createCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');

  // Completely transparent background for DTG garment printing
  ctx.clearRect(0, 0, targetWidth, targetHeight);

  ctx.save();
  ctx.scale(scale, scale);

  const themeConfig = CATALOG.themes[design.theme] || CATALOG.themes.gold;

  const dateObj = new Date(`${design.date}T${design.time}:00Z`);
  const epochMs = isNaN(dateObj.getTime()) ? Date.now() : dateObj.getTime();
  const lst = calculateLST(epochMs, design.lon);

  const cx = PRINT_WIDTH / 2;
  const cy = 2300;
  const R = 1750;

  // Draw Celestial Map
  ctx.save();
  ctx.translate(cx, cy);

  // Altitude concentric rings
  ctx.strokeStyle = themeConfig.grid;
  ctx.lineWidth = 4;
  for (const frac of [1 / 3, 2 / 3]) {
    ctx.beginPath();
    ctx.arc(0, 0, R * frac, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Azimuth radial lines
  ctx.lineWidth = 3;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    ctx.stroke();
  }

  // Outer boundary celestial rings
  ctx.strokeStyle = themeConfig.accent;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, R + 35, 0, Math.PI * 2);
  ctx.stroke();

  // Degree tick marks on outer ring
  for (let deg = 0; deg < 360; deg += 5) {
    const rad = (deg * Math.PI) / 180;
    const isMajor = deg % 30 === 0;
    const innerR = isMajor ? R - 35 : R - 18;
    ctx.lineWidth = isMajor ? 5 : 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(rad) * innerR, Math.sin(rad) * innerR);
    ctx.lineTo(Math.cos(rad) * R, Math.sin(rad) * R);
    ctx.stroke();
  }

  // Cardinal direction markers
  ctx.fillStyle = themeConfig.accent;
  ctx.font = 'bold 72px "Chivo", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', 0, -R - 85);
  ctx.fillText('S', 0, R + 85);
  ctx.fillText('E', -R - 85, 0);
  ctx.fillText('W', R + 85, 0);

  // Calculate projected positions of all stars
  const starPositions = new Map();
  const allStars = [...STARS, ...getBackgroundStars(420)];

  for (const [name, ra, dec, mag] of allStars) {
    const p = projectStar(ra, dec, lst, design.lat, R);
    if (p) starPositions.set(name, { ...p, mag });
  }

  // Constellation connection lines
  ctx.strokeStyle = themeConfig.lines;
  ctx.lineWidth = 5;
  ctx.setLineDash([12, 10]);
  for (const [s1, s2] of CONSTELLATIONS) {
    const p1 = starPositions.get(s1);
    const p2 = starPositions.get(s2);
    if (p1 && p2 && p1.r < R && p2.r < R) {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);

  // Render individual stars
  for (const [name, p] of starPositions.entries()) {
    const isNamed = !name.startsWith('bg_');
    let radius = Math.max(3, (4.5 - p.mag) * 4);
    if (p.mag < 0) radius = 18;
    else if (p.mag < 1.0) radius = 14;

    // Glowing halo for prominent stars
    if (p.mag < 1.5) {
      const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3.5);
      glowGrad.addColorStop(0, themeConfig.glow);
      glowGrad.addColorStop(0.5, themeConfig.glow.replace(/[\d.]+\)$/, '0.2)'));
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 4-point optical diffraction spike
      ctx.strokeStyle = themeConfig.stars;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x - radius * 2.6, p.y);
      ctx.lineTo(p.x + radius * 2.6, p.y);
      ctx.moveTo(p.x, p.y - radius * 2.6);
      ctx.lineTo(p.x, p.y + radius * 2.6);
      ctx.stroke();
    }

    // Core star point
    ctx.fillStyle = isNamed ? themeConfig.stars : themeConfig.secondary;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // Restore celestial map transform

  // Typography Section
  ctx.textAlign = 'center';

  // Inscription Title
  ctx.font = 'bold 135px "Chivo", sans-serif';
  ctx.fillStyle = themeConfig.text;
  ctx.fillText(design.inscription, PRINT_WIDTH / 2, 4520);

  // Date and Time
  ctx.font = '65px "JetBrainsMonoBold", monospace';
  ctx.fillStyle = themeConfig.accent;
  ctx.fillText(formatDateLabel(design.date, design.time), PRINT_WIDTH / 2, 4670);

  // Coordinates and Location
  ctx.font = '52px "JetBrainsMono", monospace';
  ctx.fillStyle = themeConfig.text;
  ctx.fillText(formatCoordLabel(design.lat, design.lon, design.locationName), PRINT_WIDTH / 2, 4790);

  // Brand tag
  ctx.font = '38px "JetBrainsMono", monospace';
  ctx.fillStyle = themeConfig.accent;
  ctx.fillText('ASTROTHREAD  •  1-OF-1 CELESTIAL PRINT', PRINT_WIDTH / 2, 4920);

  ctx.restore(); // Restore root transform

  return canvas.toBuffer('image/png');
}
