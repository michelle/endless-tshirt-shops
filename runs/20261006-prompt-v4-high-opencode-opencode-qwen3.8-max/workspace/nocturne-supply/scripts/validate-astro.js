// Validates the production SkyEngine against independent expectations.
const { SkyEngine, moonIsWaxing, moonPhaseName } = require('../lib/astro');
const A = require('astronomy-engine');

let failures = 0;
function check(name, actual, expected, tol) {
  const ok = Math.abs(actual - expected) <= tol;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: got ${actual.toFixed(4)}, expected ~${expected.toFixed(4)} (±${tol})`);
}

// 1) Sirius over London 2026-01-15 21:00 UTC.
//    Ground truth from scripts/validate-classical.js (IAU1976 precession + IAU1982 GMST + spherical trig):
//    alt 16.6990, az 149.1964
{
  const sky = new SkyEngine(new Date(Date.UTC(2026, 0, 15, 21, 0, 0)), 51.5074, -0.1278);
  const p = sky.project(101.28715, -16.71612);
  check('Sirius alt vs classical', p.alt, 16.699, 0.01);
  check('Sirius az vs classical', p.az, 149.1964, 0.01);
}

// 2) Sun at Greenwich solstice noon 2026-06-21 12:00 UTC: alt ~61.9, az ~180
{
  const sky = new SkyEngine(new Date(Date.UTC(2026, 5, 21, 12, 0, 0)), 51.4777, -0.0005);
  const s = sky.sun();
  check('Sun alt Greenwich solstice noon', s.alt, 61.97, 0.4);
  check('Sun az (due south)', s.az, 180, 2);
}

// 3) Polaris circles the pole: alt ≈ latitude ± 0.7 (its 0.66 deg pole distance)
{
  for (const hrs of [0, 6, 12, 18]) {
    const sky = new SkyEngine(new Date(Date.UTC(2001, 2, 14, hrs, 0, 0)), 40.7128, -74.006);
    const p = sky.project(37.9546, 89.26417);
    check(`Polaris alt @${hrs}h ≈ lat 40.713`, p.alt, 40.713, 0.9);
  }
}

// 4) Southern sky: Southern Cross over Sydney, Australia Day 2001-01-26 22:00 local (11:00 UTC).
//    Crux culminates low in the south around midnight in late Jan; acruz (Acrux, mag 0.77)
//    dec ~ -63.1 => max alt at lat -33.87 = 90-33.87-63.1 ~ -7 (never high). Expect alt < 30.
{
  const sky = new SkyEngine(new Date(Date.UTC(2001, 0, 26, 11, 0, 0)), -33.8688, 151.2093);
  const acrux = sky.project(12.715 * 15, -63.099); // Acrux J2000 RA 12.715h
  if (!(acrux.alt < 30 && acrux.alt > -40)) { failures++; console.log(`FAIL  Acrux alt ${acrux.alt} implausible for Sydney`); }
  else console.log(`PASS  Acrux alt ${acrux.alt.toFixed(2)}° az ${acrux.az.toFixed(2)}° (low southern sky, Sydney)`);
  // Polaris must be below horizon in Sydney
  const pol = sky.project(37.9546, 89.26417);
  if (!(pol.alt < 0)) { failures++; console.log(`FAIL  Polaris alt ${pol.alt} should be <0 in Sydney`); }
  else console.log(`PASS  Polaris below horizon in Sydney (alt ${pol.alt.toFixed(2)}°)`);
}

// 5) Moon phase machinery
{
  const t0 = A.MakeTime(new Date(Date.UTC(2026, 9, 6)));
  const full = A.SearchMoonPhase(180, t0, 30);
  const skyF = new SkyEngine(full.date, 51.5074, -0.1278);
  const mF = skyF.moon();
  check('full moon phase_fraction', mF.phaseFraction, 1, 0.02);
  console.log(`      full moon name: ${moonPhaseName(mF.phaseFraction, moonIsWaxing(full.date))}`);
  const wax = new SkyEngine(new Date(Date.UTC(2026, 9, 18, 20, 0, 0)), 40.7128, -74.006);
  const mw = wax.moon();
  console.log(`      2026-10-18 moon: fraction ${mw.phaseFraction.toFixed(2)}, waxing=${moonIsWaxing(wax.date)}, name="${moonPhaseName(mw.phaseFraction, moonIsWaxing(wax.date))}"`);
}

// 6) Planets: Jupiter should always be within its orbit-inclined band; just check values are finite & plausible mag
{
  const sky = new SkyEngine(new Date(Date.UTC(2026, 9, 6, 22, 0, 0)), 40.7128, -74.006);
  const ps = sky.planets();
  for (const p of ps) {
    if (!Number.isFinite(p.alt) || !Number.isFinite(p.az) || !Number.isFinite(p.mag)) {
      failures++; console.log(`FAIL  planet ${p.name} non-finite`);
    }
  }
  console.log(`      planets: ${ps.map((p) => `${p.name} alt ${p.alt.toFixed(1)}° mag ${p.mag.toFixed(1)}`).join(', ')}`);
}

// 7) Performance: project all 5044 stars — must be fast enough for per-request rendering
{
  const stars = require('../data/stars.json');
  const sky = new SkyEngine(new Date(Date.UTC(2001, 2, 14, 21, 42, 0)), 48.8566, 2.3522);
  const t0 = Date.now();
  let above = 0;
  for (const s of stars) { const p = sky.project(s[0], s[1]); if (p.alt > 0) above++; }
  const ms = Date.now() - t0;
  console.log(`      projected ${stars.length} stars in ${ms}ms (${above} above horizon)`);
  if (ms > 500) { failures++; console.log('FAIL  projection too slow'); }
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
