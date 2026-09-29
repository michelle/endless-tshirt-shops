// Server-side PNG rendering of the star map using @napi-rs/canvas.
// Produces a print-ready transparent PNG sized to the Prodigi front print area.

import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import path from "path";
import { generateStarMap, type StarMapParams } from "./starmap";

// Register bundled fonts once.
let fontsReady = false;
function ensureFonts() {
  if (fontsReady) return;
  const dir = path.join(process.cwd(), "lib", "fonts");
  GlobalFonts.registerFromPath(path.join(dir, "CormorantGaramond.ttf"), "Cormorant Garamond");
  GlobalFonts.registerFromPath(path.join(dir, "Montserrat-Regular.ttf"), "Montserrat");
  fontsReady = true;
}

// Print area for the front of GLOBAL-TEE-BC-3001 (EU/US variants).
export const PRINT_W = 2480;
export const PRINT_H = 3507;

export interface RenderOptions {
  params: StarMapParams;
}

export function renderStarMapPng({ params }: RenderOptions): Buffer {
  ensureFonts();

  const W = PRINT_W;
  const H = PRINT_H;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Transparent background (DTG prints ink directly onto the shirt).
  ctx.clearRect(0, 0, W, H);

  const ink = params.ink === "light" ? "#f4efe4" : "#1c1c2e";
  const inkSoft = params.ink === "light" ? "rgba(244,239,228," : "rgba(28,28,46,";

  const map = generateStarMap(params);

  // --- layout constants ---
  const cx = W / 2; // 1240
  const cy = 1900;
  const R = 880;
  const scale = (2 * R) / 1000; // star.r is relative to a 1000px sky

  // --- sky circle background (very subtle) ---
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = params.ink === "light" ? "rgba(244,239,228,0.03)" : "rgba(28,28,46,0.04)";
  ctx.fill();
  ctx.restore();

  // --- stars ---
  for (const s of map.stars) {
    const px = cx + (s.x - 0.5) * 2 * R;
    const py = cy + (s.y - 0.5) * 2 * R;
    const r = Math.max(0.5, s.r * scale);
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // --- constellation lines ---
  ctx.save();
  ctx.strokeStyle = inkSoft + "0.35)";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  for (const [a, b] of map.lines) {
    const sa = map.stars[a];
    const sb = map.stars[b];
    ctx.beginPath();
    ctx.moveTo(cx + (sa.x - 0.5) * 2 * R, cy + (sa.y - 0.5) * 2 * R);
    ctx.lineTo(cx + (sb.x - 0.5) * 2 * R, cy + (sb.y - 0.5) * 2 * R);
    ctx.stroke();
  }
  ctx.restore();

  // --- highlight star ("your star") ---
  const hs = map.stars[map.highlight];
  const hx = cx + (hs.x - 0.5) * 2 * R;
  const hy = cy + (hs.y - 0.5) * 2 * R;

  // glow
  const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 90);
  glow.addColorStop(0, inkSoft + "0.5)");
  glow.addColorStop(1, inkSoft + "0)");
  ctx.save();
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(hx, hy, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // crosshair
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  const arm = 26;
  const gap = 12;
  ctx.beginPath();
  ctx.moveTo(hx - arm, hy);
  ctx.lineTo(hx - gap, hy);
  ctx.moveTo(hx + gap, hy);
  ctx.lineTo(hx + arm, hy);
  ctx.moveTo(hx, hy - arm);
  ctx.lineTo(hx, hy - gap);
  ctx.moveTo(hx, hy + gap);
  ctx.lineTo(hx, hy + arm);
  ctx.stroke();
  ctx.restore();

  // --- circle border ---
  ctx.save();
  ctx.strokeStyle = inkSoft + "0.5)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // --- title ---
  ctx.save();
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "600 150px 'Cormorant Garamond'";
  ctx.fillText(params.title, cx, 470);
  ctx.restore();

  // small ornament under title
  ctx.save();
  ctx.fillStyle = inkSoft + "0.7)";
  ctx.textAlign = "center";
  ctx.font = "40px 'Montserrat'";
  ctx.fillText("✦", cx, 560);
  ctx.restore();

  // --- date ---
  const dateLabel = formatDate(params.date);
  ctx.save();
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.font = "500 72px 'Montserrat'";
  ctx.fillText(dateLabel, cx, 3000);
  ctx.restore();

  // --- location + coordinates ---
  const coords = formatCoords(params.lat, params.lng);
  ctx.save();
  ctx.fillStyle = inkSoft + "0.85)";
  ctx.textAlign = "center";
  ctx.font = "400 56px 'Montserrat'";
  ctx.fillText(`${params.locationName}  ·  ${coords}`, cx, 3120);
  ctx.restore();

  // --- wordmark ---
  ctx.save();
  ctx.fillStyle = inkSoft + "0.6)";
  ctx.textAlign = "center";
  ctx.font = "500 44px 'Montserrat'";
  ctx.fillText("S T E L L A R", cx, 3380);
  ctx.restore();

  return canvas.toBuffer("image/png");
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatCoords(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)}° ${latDir}, ${Math.abs(lng).toFixed(3)}° ${lngDir}`;
}
