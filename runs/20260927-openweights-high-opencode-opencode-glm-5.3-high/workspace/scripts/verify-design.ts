/**
 * Design verification without eyes: renders sample specs to raw RGBA pixels,
 * prints a coarse ASCII view of ink coverage, and asserts the geometry
 * (lit side, terminator, starfield, text bands). Local tool only.
 *
 * Dates for each phase are found by scanning 2026 with the same phase math the
 * app uses, so the assertions track the astronomy rather than hand-picked dates.
 */
import { Resvg } from "@resvg/resvg-js";
import { join } from "node:path";
import { buildArtworkSvg } from "../src/lib/design";
import { moonPhaseAt } from "../src/lib/moon";
import type { DesignSpec } from "../src/lib/params";

const fontFiles = [
  "CormorantGaramond-Light.ttf", "CormorantGaramond-Medium.ttf",
  "CormorantGaramond-SemiBold.ttf", "CormorantGaramond-RegularItalic.ttf",
  "CormorantGaramond-MediumItalic.ttf", "IBMPlexSans-Regular.ttf",
  "IBMPlexSans-Medium.ttf", "IBMPlexSans-SemiBold.ttf",
].map((f) => join(process.cwd(), "public/fonts/static", f));

function render(spec: DesignSpec) {
  const svg = buildArtworkSvg(spec);
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 4677 }, font: { fontFiles, loadSystemFonts: false } });
  const img = resvg.render();
  return { width: img.width, height: img.height, pixels: img.pixels };
}

function asciiView(px: Uint8Array, w: number, h: number, cols = 96, rows = 110) {
  const shades = " .:-=+*#%@";
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) {
      const x0 = Math.floor((c * w) / cols), x1 = Math.floor(((c + 1) * w) / cols);
      const y0 = Math.floor((r * h) / rows), y1 = Math.floor(((r + 1) * h) / rows);
      let sum = 0, n = 0;
      for (let y = y0; y < y1; y += 7) for (let x = x0; x < x1; x += 7) {
        const a = px[(y * w + x) * 4 + 3];
        sum += a; n++;
      }
      const cover = sum / Math.max(n, 1) / 255;
      line += shades[Math.min(shades.length - 1, Math.floor(cover * shades.length * 2.2))];
    }
    lines.push(line);
  }
  return lines.join("\n");
}

function bandStats(px: Uint8Array, w: number, y: number, halfH = 20) {
  const stats = { left: 0, right: 0, nL: 0, nR: 0 };
  for (let yy = y - halfH; yy < y + halfH; yy += 4) {
    for (let xx = 0; xx < w; xx += 6) {
      const a = px[(yy * w + xx) * 4 + 3];
      const covered = a > 40;
      if (xx < w / 2) { stats.nL++; if (covered) stats.left++; }
      else { stats.nR++; if (covered) stats.right++; }
    }
  }
  return { leftPct: Math.round((100 * stats.left) / stats.nL), rightPct: Math.round((100 * stats.right) / stats.nR) };
}

function assert(cond: boolean, msg: string) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) process.exitCode = 1;
}

/** Find the 2026 date whose elongation is closest to a target. */
function findDateForElongation(target: number): { date: string; time: string; elong: number } {
  let best: { date: string; time: string; elong: number; err: number } | null = null;
  for (let day = 0; day < 365; day++) {
    for (const hour of [0, 12]) {
      const ms = Date.UTC(2026, 0, 1 + day, hour);
      const elong = moonPhaseAt(ms).elongation;
      const err = Math.abs(elong - target);
      if (!best || err < best.err) {
        const d = new Date(ms);
        const p = (n: number) => String(n).padStart(2, "0");
        best = {
          date: `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`,
          time: `${p(d.getUTCHours())}:00`,
          elong, err,
        };
      }
    }
  }
  return best!;
}

const SHOW_ASCII = process.argv.includes("--ascii");

for (const target of [0, 45, 90, 135, 180, 225, 270, 315]) {
  const { date, time, elong } = findDateForElongation(target);
  const illum = (1 - Math.cos((elong * Math.PI) / 180)) / 2;
  for (const hemisphere of ["N", "S"] as const) {
    const spec: DesignSpec = { date, time, hemisphere, garment: "black" };
    const { pixels, width, height } = render(spec);
    const moon = bandStats(pixels, width, 2050, 400);
    const waxing = elong < 180;
    const litRight = waxing === (hemisphere === "N");
    const litPct = litRight ? moon.rightPct : moon.leftPct;
    const unlitPct = litRight ? moon.leftPct : moon.rightPct;
    const phaseName = moonPhaseAt(Date.UTC(...(date.split("-").map(Number) as [number, number, number]), 12)).phaseName;
    const title = `elong ${elong.toFixed(1)}° (${phaseName}, ${(illum * 100).toFixed(0)}%) ${hemisphere} ${date} ${time}`;
    if (SHOW_ASCII) {
      console.log(`\n=== ${title} ===`);
      console.log(asciiView(pixels, width, height));
    } else {
      console.log(`${title}: moon L/R ${moon.leftPct}/${moon.rightPct}`);
    }
    if (illum > 0.15) {
      assert(litPct > 25, `lit side carries the surface (${litPct}%)`);
      // Beyond half-full the lit region legitimately crosses the disc's
      // midline; on the image's "unlit" side expect roughly the disc's
      // coverage scaled by how far past half the moon is.
      const expectedSpill = 60 * Math.max(0, 2 * illum - 1);
      assert(
        Math.abs(unlitPct - expectedSpill) < 18,
        `unlit side matches the phase (got ${unlitPct}%, expect ~${expectedSpill.toFixed(0)}%)`
      );
    } else {
      assert(litPct < 25 && unlitPct < 15, "thin crescent: both sides light on ink");
    }
  }
}

// typography and structure on one representative spec
{
  const spec: DesignSpec = { date: "2026-09-05", time: "22:41", hemisphere: "N", garment: "black", line: "for Mira" };
  const { pixels, width } = render(spec);
  const brand = bandStats(pixels, width, 470, 30);
  const dateB = bandStats(pixels, width, 3905, 60);
  const lineB = bandStats(pixels, width, 4330, 40);
  const footer = bandStats(pixels, width, 5478, 20);
  console.log("\ntypography bands (L/R %):", { brand, dateB, lineB, footer });
  assert(brand.leftPct > 0 && brand.rightPct > 0, `brand text present (${brand.leftPct}/${brand.rightPct}%)`);
  assert(dateB.leftPct > 0 && dateB.rightPct > 0, `date text present (${dateB.leftPct}/${dateB.rightPct}%)`);
  assert(lineB.leftPct > 0 && lineB.rightPct > 0, `personal line present (${lineB.leftPct}/${lineB.rightPct}%)`);
  assert(footer.leftPct > 0 && footer.rightPct > 0, `footer text present (${footer.leftPct}/${footer.rightPct}%)`);
}

console.log("\ndone");
