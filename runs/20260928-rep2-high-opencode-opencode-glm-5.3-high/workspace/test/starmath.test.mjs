// Nightshift unit tests — run with `npm test` (node --test).
//
// The astronomy ground truth is Schlyter's published worked example for
// 1990 April 19, 00:00 UT (JD 2448000.5), cross-checked against the
// Astronomical Almanac in his tutorial. If these pass, the sky on every
// shirt is the real sky.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toJulian,
  gmstDeg,
  lstDeg,
  hadecToAltaz,
  altazToDisc,
  localToUTC,
  sunEquatorial,
  moonState,
} from '../public/js/starmath.js';
import {
  priceCents,
  findColor,
  findSize,
  findTheme,
  shippingFor,
} from '../api/_lib/config.js';

const closeTo = (actual, expected, epsilon = 0.02, label = '') =>
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `${label} expected ~${expected}, got ${actual}`,
  );

test('sun: Schlyter 1990-04-19 00:00 UT worked example', () => {
  const jd = 2448000.5;
  const sun = sunEquatorial(jd);
  // RA 26.6580 deg, Dec +11.0084 deg vs Astronomical Almanac
  closeTo(sun.raDeg, 26.658, 0.02, 'sun RA');
  closeTo(sun.decDeg, 11.008, 0.02, 'sun Dec');
  closeTo(sun.lambdaDeg, 28.687, 0.02, 'sun ecliptic longitude');
});

test('moon: Schlyter 1990-04-19 00:00 UT worked example', () => {
  const jd = 2448000.5;
  const moon = moonState(jd);
  // RA 309.5011 deg, Dec -19.1032 deg vs Astronomical Almanac
  closeTo(moon.raDeg, 309.501, 0.05, 'moon RA');
  closeTo(moon.decDeg, -19.103, 0.05, 'moon Dec');
  // Ecliptic longitude 306.9484, latitude -0.5856, distance 60.6779 Er
  closeTo(moon.lambdaDeg, 306.948, 0.05, 'moon longitude');
  closeTo(moon.betaDeg, -0.586, 0.05, 'moon latitude');
});

test('moon illumination runs and stays in range', () => {
  let fullMoonSeen = false;
  let newMoonSeen = false;
  for (let day = 0; day < 30; day++) {
    const jd = 2461000.5 + day; // ~2025-01-01 + d
    const moon = moonState(jd);
    assert.ok(moon.illumFraction >= 0 && moon.illumFraction <= 1);
    if (moon.illumFraction > 0.95) fullMoonSeen = true;
    if (moon.illumFraction < 0.05) newMoonSeen = true;
  }
  assert.ok(fullMoonSeen && newMoonSeen, 'a lunar month spans new and full');
});

test('sidereal time: Schlyter 1990-04-19 GMST0 13.78925h', () => {
  const gmst = gmstDeg(2448000.5);
  closeTo(gmst, 13.78925 * 15, 0.02, 'GMST');
  // Local sidereal time at +15 deg east: 14.78925h
  closeTo(lstDeg(2448000.5, 15), 14.78925 * 15, 0.02, 'LST');
});

test('alt/az: Schlyter sun example at 60N, +15E', () => {
  // Sun at HA 195.1808 deg, Dec +11.0084, latitude +60:
  // azimuth 15.68 deg, altitude -17.96 deg.
  const lst = 14.78925 * 15;
  const ra = 26.658;
  const { altDeg, azDeg } = hadecToAltaz(ra, 11.0084, lst, 60);
  closeTo(altDeg, -17.96, 0.05, 'altitude');
  closeTo(azDeg, 15.68, 0.05, 'azimuth');
});

test('disc projection: zenith, horizon, directions', () => {
  const zenith = altazToDisc(90, 0); // zenith -> centre
  closeTo(zenith[0], 0, 1e-9, 'zenith x');
  closeTo(zenith[1], 0, 1e-9, 'zenith y');
  // North at the horizon is at the top, East on the right.
  const north = altazToDisc(0, 0);
  const east = altazToDisc(0, 90);
  const south = altazToDisc(0, 180);
  closeTo(north[0], 0, 1e-6);
  closeTo(north[1], -1, 1e-6, 'N at top');
  closeTo(east[0], 1, 1e-6, 'E at right');
  closeTo(east[1], 0, 1e-6);
  closeTo(south[1], 1, 1e-6, 'S at bottom');
  // Due-south stars project inside the disc at mid-northern latitudes.
  const p = altazToDisc(45, 180);
  closeTo(Math.hypot(p[0], p[1]), Math.tan(22.5 * Math.PI / 180), 1e-6);
});

test('Orion is up on a February evening over New York', () => {
  // A whole-sky sanity check: 2026-02-01 21:00 America/New_York,
  // NYC (40.713 N, -74.006 E). Orion (RA ~5h20m, Dec ~0) must be
  // above the horizon, in the southern half of the sky.
  const utc = localToUTC('2026-02-01T21:00:00', 'America/New_York');
  assert.ok(utc, 'tz resolution');
  closeTo(utc.offsetMinutes, -300, 1, 'EST offset');
  const lst = lstDeg(toJulian(utc.ms), -74.006);
  const orion = hadecToAltaz(80.6, 0.9, lst, 40.713); // RA 5h22m, Dec +0.9
  assert.ok(orion.altDeg > 20 && orion.altDeg < 55, `Orion alt ${orion.altDeg}`);
  assert.ok(orion.azDeg > 130 && orion.azDeg < 210, `Orion az ${orion.azDeg}`);
});

test('Sirius transits the meridian near south from the north hemisphere', () => {
  const utc = localToUTC('2026-02-01T21:00:00', 'America/New_York');
  const lst = lstDeg(toJulian(utc.ms), -74.006);
  const sirius = hadecToAltaz(101.287, -16.716, lst, 40.713);
  assert.ok(sirius.altDeg > 0);
  assert.ok(sirius.azDeg > 120 && sirius.azDeg < 240);
});

test('localToUTC handles DST transitions both ways', () => {
  // 2026 US DST starts Mar 8 (EST, -300) and summer is EDT (-240).
  const winter = localToUTC('2026-03-01T12:00:00', 'America/New_York');
  const summer = localToUTC('2026-07-01T12:00:00', 'America/New_York');
  closeTo(winter.offsetMinutes, -300, 0, 'winter');
  closeTo(summer.offsetMinutes, -240, 0, 'summer');
  // Kathmandu has a 45-minute offset; half-hours and odd zones matter.
  closeTo(localToUTC('2026-06-01T12:00:00', 'Asia/Kathmandu').offsetMinutes, 345, 0, '+5:45');
  assert.equal(localToUTC('nonsense', 'America/New_York'), null);
  assert.equal(localToUTC('2026-02-01T21:00:00', 'Mars/Olympus'), null);
});

test('pricing is server-side and authoritative', () => {
  assert.deepEqual(priceCents({ sizeId: 'm', quantity: 1, countryCode: 'US' }), {
    unitCents: 3800,
    quantity: 1,
    subtotalCents: 3800,
    shippingCents: 650,
    totalCents: 4450,
  });
  assert.equal(priceCents({ sizeId: '4xl', quantity: 3, countryCode: 'GB' }).totalCents, 44 * 3 * 100 + 1400);
  assert.equal(priceCents({ sizeId: '5xl', quantity: 1, countryCode: 'US' }), null);
  assert.equal(shippingFor('us').id, 'us');
  assert.equal(shippingFor('de').id, 'intl');
  assert.ok(findColor('white').prodigi === 'white');
  assert.ok(findSize('2xl').cents === 4000);
  assert.ok(findTheme('aurora') && !findTheme('nope'));
  // Quantity is clamped, not trusted.
  assert.equal(priceCents({ sizeId: 'm', quantity: 99, countryCode: 'US' }).quantity, 5);
  assert.equal(priceCents({ sizeId: 'm', quantity: 0, countryCode: 'US' }).quantity, 1);
});
