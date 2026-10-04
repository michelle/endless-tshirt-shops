// Sanity checks for the NOCTURNE astronomy core against known astronomical facts.
'use strict';
const astro = require('../lib/astro');

let failures = 0;
function check(name, actual, expected, tol) {
  const ok = Math.abs(actual - expected) <= tol;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got ${actual.toFixed(4)}, expected ~${expected} (±${tol})`);
  if (!ok) failures++;
}
function checkAngle(name, actual, expected, tol) {
  const d = Math.min(Math.abs(actual - expected), 360 - Math.abs(actual - expected));
  const ok = d <= tol;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got ${actual.toFixed(4)}°, expected ~${expected}° (±${tol}°)`);
  if (!ok) failures++;
}

// 1. GMST at J2000.0 epoch = 280.46061837°
check('GMST at J2000', astro.gmst(2451545.0), 280.46061837, 0.001);

// 2. GMST half a day earlier
check('GMST at 2000-01-01 0h UT', astro.gmst(2451544.5), (280.46061837 - 360.98564736629 * 0.5 + 360) % 360, 0.01);

// 3. Polaris (ra 37.95°, dec 89.35°): altitude ≈ observer latitude; azimuth ≈ north (0/360)
{
  const lst = astro.localSiderealTime(2460587.5, 0);
  const { alt, az } = astro.equatorialToHorizontal(37.95, 89.35, lst, 40.0);
  check('Polaris alt at lat 40N', alt, 40.0, 1.0);
  const azOk = az < 5 || az > 355;
  console.log(`${azOk ? 'PASS' : 'FAIL'} Polaris azimuth ≈ north: got ${az.toFixed(2)}°`);
  if (!azOk) failures++;
}

// 4. Galactic -> equatorial transform, cross-checked against the standard J2000 rotation matrix
//    (Hipparcos documentation; galactic rectangular -> equatorial rectangular).
{
  const M = [
    [-0.0548755604, +0.4941094279, +0.8676661549],
    [-0.8734370902, -0.4448296300, +0.1980763734],
    [-0.4838350155, +0.7469822445, +0.4559837762],
  ];
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  let allOk = true;
  for (const l of [0, 30, 90, 150, 180, 270]) {
    const bg = 0;
    const xg = Math.cos(bg * D2R) * Math.cos(l * D2R);
    const yg = Math.cos(bg * D2R) * Math.sin(l * D2R);
    const zg = Math.sin(bg * D2R);
    const xe = M[0][0] * xg + M[0][1] * yg + M[0][2] * zg;
    const ye = M[1][0] * xg + M[1][1] * yg + M[1][2] * zg;
    const ze = M[2][0] * xg + M[2][1] * yg + M[2][2] * zg;
    const decM = Math.asin(ze) * R2D;
    const raM = (((Math.atan2(ye, xe) * R2D) % 360) + 360) % 360;
    const { ra, dec } = astro.galacticToEquatorial(l, bg);
    const dRa = Math.min(Math.abs(ra - raM), 360 - Math.abs(ra - raM));
    const ok = dRa < 1e-6 && Math.abs(dec - decM) < 1e-6;
    if (!ok) {
      allOk = false;
      console.log(`FAIL galactic l=${l}: ours ra=${ra.toFixed(5)} dec=${dec.toFixed(5)} vs matrix ra=${raM.toFixed(5)} dec=${decM.toFixed(5)}`);
      failures++;
    }
  }
  if (allOk) console.log('PASS galactic->equatorial matches standard rotation matrix (l=0,30,90,150,180,270)');
  // literature anchor: galactic center ra≈266.405, dec≈-28.936
  const gc = astro.galacticToEquatorial(0, 0);
  checkAngle('Galactic center RA', gc.ra, 266.405, 0.05);
  check('Galactic center Dec', gc.dec, -28.936, 0.05);
}

// 5. Winter sky over New York: 2025-01-15 21:00 EST (= 2025-01-16 02:00 UTC), lat 40.71, lng -74.01
//    Betelgeuse (ra 88.79, dec 7.41): high in the SE (alt 45-65, az 130-175)
//    Sirius (ra 101.29, dec -16.72): ESE, lower (alt 10-40, az 115-165)
//    Vega (ra 279.23, dec 38.78): set below horizon in the NW (alt < 5, az 270-330)
{
  const jd = astro.julianDate(new Date(Date.UTC(2025, 0, 16, 2, 0, 0)));
  const lst = astro.localSiderealTime(jd, -74.01);
  const betelgeuse = astro.equatorialToHorizontal(88.79, 7.41, lst, 40.71);
  const sirius = astro.equatorialToHorizontal(101.29, -16.72, lst, 40.71);
  const vega = astro.equatorialToHorizontal(279.23, 38.78, lst, 40.71);
  console.log(`NYC 2025-01-15 21:00 EST -> Betelgeuse alt ${betelgeuse.alt.toFixed(1)} az ${betelgeuse.az.toFixed(1)}; Sirius alt ${sirius.alt.toFixed(1)} az ${sirius.az.toFixed(1)}; Vega alt ${vega.alt.toFixed(1)} az ${vega.az.toFixed(1)}`);
  const ok =
    betelgeuse.alt > 45 && betelgeuse.alt < 65 && betelgeuse.az > 130 && betelgeuse.az < 175 &&
    sirius.alt > 10 && sirius.alt < 40 && sirius.az > 115 && sirius.az < 165 &&
    vega.alt < 5 && (vega.az > 270 || vega.az < 330);
  console.log(`${ok ? 'PASS' : 'FAIL'} winter Orion/Sirius/Vega geometry over NYC`);
  if (!ok) failures++;
}

// 6. Sidereal day: LST advances ~360.9856°/day
{
  const a = astro.localSiderealTime(2460587.5, 10);
  const b = astro.localSiderealTime(2460588.5, 10);
  check('LST advance per day', ((b - a + 360) % 360), 360.98564736629 % 360, 0.001);
}

// 7. Moon phase against almanac data (timeanddate.com / Royal Observatory of Belgium, UTC):
//    Full moon 2026-09-26 16:49 UTC; Last quarter 2026-10-03 13:24 UTC; New moon 2026-10-10 15:49 UTC
for (const [label, iso, expPhase, expIll] of [
  ['full 2026-09-26 16:49', '2026-09-26T16:49:00Z', 0.5, 1.0],
  ['last quarter 2026-10-03 13:24', '2026-10-03T13:24:00Z', 0.75, 0.5],
  ['new 2026-10-10 15:49', '2026-10-10T15:49:00Z', 0.0, 0.0],
  ['first quarter 2026-10-18 16:12', '2026-10-18T16:12:00Z', 0.25, 0.5],
]) {
  const p = astro.moonPhase(new Date(iso));
  const dp = Math.min(Math.abs(p.phase - expPhase), 1 - Math.abs(p.phase - expPhase));
  const ok = dp < 0.02 && Math.abs(p.illuminated - expIll) < 0.04;
  console.log(`${ok ? 'PASS' : 'FAIL'} moon ${label}: phase ${p.phase.toFixed(3)} (exp ~${expPhase}), illum ${p.illuminated.toFixed(3)} (exp ~${expIll})`);
  if (!ok) failures++;
}

// 8. Sun position: NYC mid-January solar noon ≈ 17:05Z, declination ≈ -21°, so alt ≈ 90-40.7-21 = 28°
{
  const sky = astro.computeSky({ date: new Date('2025-01-16T17:05:00Z'), lat: 40.71, lng: -74.01 });
  check('sun alt NYC midwinter noon', sky.sun.alt, 28.2, 1.5);
  checkAngle('sun az NYC midwinter noon', sky.sun.az, 180, 3);
}
// 8b. NYC mid-January 21:00 local (02:00Z): sun ~4h after the 16:50 sunset -> deep twilight
{
  const sky = astro.computeSky({ date: new Date('2025-01-16T02:00:00Z'), lat: 40.71, lng: -74.01 });
  const ok = sky.sun.alt < -30 && sky.sun.alt > -55;
  console.log(`${ok ? 'PASS' : 'FAIL'} sun alt NYC midwinter 21:00 local: ${sky.sun.alt.toFixed(1)}° (expect -30..-55)`);
  if (!ok) failures++;
}

// 9. computeSky smoke tests
{
  // Reykjavik (64.15N) in July: circumpolar-rich sky, single milky-way arc, some bright stars
  const sky = astro.computeSky({ date: new Date('2026-07-04T22:00:00Z'), lat: 64.15, lng: -21.94 });
  const bright = sky.stars.filter((s) => s.mag <= 1.5).length;
  const ok = sky.stars.length > 1200 && sky.galacticRuns.length >= 1 && bright >= 3;
  console.log(`${ok ? 'PASS' : 'FAIL'} computeSky Reykjavik July: ${sky.stars.length} stars, ${sky.galacticRuns.length} milky-way run(s), ${bright} bright`);
  if (!ok) failures++;
  // All stars must be inside the unit disc and above the horizon margin
  const inside = sky.stars.every((s) => Math.hypot(s.x, s.y) <= 1.0);
  console.log(`${inside ? 'PASS' : 'FAIL'} all projected stars within unit disc`);
  if (!inside) failures++;
}
{
  // Madrid (40.4N) in January: Orion up, winter milky way rich, galactic anti-center high
  const sky = astro.computeSky({ date: new Date('2026-01-14T22:00:00Z'), lat: 40.42, lng: -3.7 });
  const bright = sky.stars.filter((s) => s.mag <= 1.0).length;
  const ok = sky.stars.length > 2000 && sky.galacticRuns.length >= 1 && bright >= 6;
  console.log(`${ok ? 'PASS' : 'FAIL'} computeSky Madrid January: ${sky.stars.length} stars, ${sky.galacticRuns.length} milky-way run(s), ${bright} bright (<=1.0)`);
  if (!ok) failures++;
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
