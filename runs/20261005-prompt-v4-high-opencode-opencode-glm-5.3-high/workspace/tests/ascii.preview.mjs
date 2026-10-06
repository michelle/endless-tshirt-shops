// ASCII "screenshot" of the chart layout for visual sanity-checking in a terminal.
// Prints the sky chart (stars, ring, cardinal points, text zones) as text.
import { readFileSync } from "node:fs";
import { skyPositions, wallTimeToUtc, lstDeg, radecToAltaz } from "../src/astro.js";

const stardata = {
  stars: JSON.parse(readFileSync("data/stars.json", "utf8")),
  lines: JSON.parse(readFileSync("data/lines.json", "utf8")),
};

const design = {
  place: "NEW YORK, USA", dateStr: "2025-01-01", timeStr: "22:00",
  tz: "America/New_York", lat: 40.7128, lon: -74.006, showLines: true,
};
const date = wallTimeToUtc(design.dateStr, design.timeStr, design.tz);

const W = 104, H = 52;
const grid = Array.from({ length: H }, () => Array(W).fill(" "));
const R = Math.min(W, H * 2.1) / 2 - 6;
const cx = W / 2, cy = H / 2;

const { pts, segs } = skyPositions({
  date, lat: design.lat, lon: design.lon,
  stars: stardata.stars, constellations: stardata.lines,
});

// ring
for (let a = 0; a < 360; a += 0.5) {
  const x = Math.round(cx + Math.sin(a * Math.PI / 180) * R);
  const y = Math.round(cy - Math.cos(a * Math.PI / 180) * R / 2.1);
  if (y >= 0 && y < H && x >= 0 && x < W && grid[y][x] === " ") grid[y][x] = "·";
}
// constellation lines
for (const seg of segs) {
  for (let i = 1; i < seg.length; i++) {
    for (let t = 0; t <= 10; t++) {
      const x = Math.round(cx + (seg[i - 1][0] + (seg[i][0] - seg[i - 1][0]) * t / 10) * R);
      const y = Math.round(cy - (seg[i - 1][1] + (seg[i][1] - seg[i - 1][1]) * t / 10) * R / 2.1);
      if (y >= 0 && y < H && x >= 0 && x < W && grid[y][x] === " ") grid[y][x] = ".";
  }
}
}
// stars: size by magnitude
const MAGCH = [[2.0, "O"], [3.0, "o"], [4.2, "*"], [99, "·"]];
for (const s of pts) {
  const x = Math.round(cx + s.x * R);
  const y = Math.round(cy + s.y * R / 2.1);
  if (y < 0 || y >= H || x < 0 || x >= W) continue;
  const ch = MAGCH.find(([m]) => s.mag < m)[1];
  grid[y][x] = ch;
}
// cardinals
grid[Math.round(cy - R / 2.1 - 1)][Math.round(cx)] = "N";
grid[Math.round(cy)][Math.round(cx - R - 2)] = "E";
grid[Math.round(cy + R / 2.1 + 1)][Math.round(cx)] = "S";
grid[Math.round(cy)][Math.round(cx + R + 2)] = "W";

// title / footer bands
const title = "· " + "THE NIGHT WE MET".split("").join(" ") + " ·";
grid[2].splice(Math.round(cx - title.length / 2), title.length, ...title.split(""));
const sub = "NEW YORK, USA · 01 JANUARY 2025 · 22:00";
grid[H - 3].splice(Math.round(cx - sub.length / 2), sub.length, ...sub.split(""));

console.log(grid.map((r) => r.join("")).join("\n"));

// Spot-check bright named stars (RA, Dec) and where they land
const lst = lstDeg(date, design.lon);
const named = {
  Sirius: [101.287, -16.716], Betelgeuse: [88.793, 7.407],
  Rigel: [78.634, -8.202], Polaris: [37.955, 89.264],
  "Alkaid (Big Dipper)": [206.885, 49.313], Capella: [79.172, 45.998],
};
for (const [n, [ra, dec]] of Object.entries(named)) {
  const { alt, az } = radecToAltaz(ra, dec, lst, design.lat);
  const x = Math.round(cx + (-Math.tan((90 - alt) * Math.PI / 360)) * Math.sin(az * Math.PI / 180) * R);
  const y = Math.round(cy + (-Math.tan((90 - alt) * Math.PI / 360)) * Math.cos(az * Math.PI / 180) * R / 2.1);
  console.log(`${n.padEnd(20)} alt=${alt.toFixed(1).padStart(5)} az=${az.toFixed(1).padStart(6)}  grid(${x},${y}) ${alt > 0 ? "" : "  <below horizon>"}`);
}
