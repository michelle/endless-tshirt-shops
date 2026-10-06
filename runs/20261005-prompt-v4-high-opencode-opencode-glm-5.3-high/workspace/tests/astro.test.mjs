import { readFileSync } from "node:fs";
import {
  gmstDeg, radecToAltaz, projectAltaz, wallTimeToUtc, lstDeg, skyPositions,
} from "../src/astro.js";

let failures = 0;
const eq = (name, actual, expected, tol) => {
  const ok = Math.abs(actual - expected) <= (tol ?? 1e-6);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${actual.toFixed(4)} (expected ${expected}±${tol ?? 0})`);
};
const truthy = (name, v) => {
  if (!v) failures++;
  console.log(`${v ? "PASS" : "FAIL"}  ${name}`);
};

// 1. GMST known value: at J2000.0 (2000-01-01 12:00 UT), GMST ≈ 280.46062°
eq("GMST at J2000.0", gmstDeg(new Date("2000-01-01T12:00:00Z")), 280.46062, 0.05);

// 2. Polaris altitude ≈ observer latitude (within ~1°)
for (const lat of [19.4, 40.7, 64.1]) {
  const { alt } = radecToAltaz(37.95, 89.264, lstDeg(new Date("2025-03-01T04:00:00Z"), 0), lat);
  eq(`Polaris altitude at lat ${lat}`, alt, lat, 1.0);
}

// 3. Vega from NYC on the June solstice evening: near zenith (alt > 70°)
{
  const date = new Date("2025-06-20T01:00:00Z"); // 21:00 EDT June 19... use June 21 05Z
  const d2 = new Date("2025-06-21T05:00:00Z"); // 01:00 EDT June 21
  const lst = lstDeg(d2, -74.006);
  const { alt, az } = radecToAltaz(279.2344, 38.7837, lst, 40.7128);
  console.log(`INFO   Vega from NYC 2025-06-21 01:00 EDT: alt=${alt.toFixed(1)} az=${az.toFixed(1)}`);
  truthy("Vega high in the sky on June night (alt>70)", alt > 70);
}

// 4. Orion belt stars visible from NYC on a January evening, in the southern sky
{
  const date = new Date("2025-01-01T03:00:00Z"); // Dec 31 22:00 EST
  const lst = lstDeg(date, -74.006);
  const belt = [ // Mintaka, Alnilam, Alnitak (RA, Dec)
    [83.787, -0.299], [84.05, -1.202], [84.40, -1.94],
  ];
  for (const [ra, dec] of belt) {
    const { alt, az } = radecToAltaz(ra, dec, lst, 40.7128);
    console.log(`INFO   Orion belt star: alt=${alt.toFixed(1)} az=${az.toFixed(1)}`);
    truthy("Orion above horizon (alt>20)", alt > 20);
    truthy("Orion in the southern half (az 90..270)", az > 90 && az < 270);
  }
}

// 5. Projection: zenith -> centre; horizon az N/E/S/W at top/left/bottom/right
const p = (alt, az) => projectAltaz(alt, az);
eq("projection: zenith x", p(90, 0).x, 0);
eq("projection: zenith y", p(90, 0).y, 0);
eq("projection: horizon N y", p(0, 0).y, -1);
eq("projection: horizon E x", p(0, 90).x, -1); // East on the LEFT (look-up view)
eq("projection: horizon S y", p(0, 180).y, 1);
eq("projection: horizon W x", p(0, 270).x, 1);

// 6. Timezone wall-time -> UTC (DST aware)
{
  const summer = wallTimeToUtc("2021-06-14", "21:34", "Europe/Paris"); // UTC+2
  eq("Paris summer walltime->UTC", summer.getTime(), Date.parse("2021-06-14T19:34:00Z"));
  const winter = wallTimeToUtc("2021-01-14", "21:34", "Europe/Paris"); // UTC+1
  eq("Paris winter walltime->UTC", winter.getTime(), Date.parse("2021-01-14T20:34:00Z"));
  const ny = wallTimeToUtc("2021-11-07", "01:30", "America/New_York"); // DST fall-back night (ambiguous)
  eq("NY DST fall-back (first occurrence, EDT)", ny.getTime(), Date.parse("2021-11-07T05:30:00Z"));
}

// 7. skyPositions: every returned point inside unit circle, plausible counts
{
  const stardata = {
    stars: JSON.parse(readFileSync("data/stars.json", "utf8")),
    lines: JSON.parse(readFileSync("data/lines.json", "utf8")),
  };
  const { pts, segs } = skyPositions({
    date: new Date("2021-06-14T19:34:00Z"),
    lat: 48.8566, lon: 2.3522,
    stars: stardata.stars, constellations: stardata.lines,
  });
  truthy(`Paris June evening: ${pts.length} stars up (should be ~1400-2200)`, pts.length > 1300 && pts.length < 2300);
  truthy(`constellation segments drawn (${segs.length})`, segs.length > 40);
  truthy("all points within horizon circle", pts.every(pt => Math.hypot(pt.x, pt.y) <= 1.0));
}

console.log(failures === 0 ? "\nALL ASTRONOMY TESTS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
