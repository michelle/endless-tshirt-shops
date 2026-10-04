import test from 'node:test';
import assert from 'node:assert/strict';
import { skyOn, parseDate, moonElongation, julianDay } from '../src/astro.js';

// JPL Horizons heliocentric ecliptic vectors (AU) for 1990-07-15 12:00 UT
const HORIZONS = {
  mercury: [-0.3628562, 0.07264357],
  venus: [0.53130837, 0.49003131],
  earth: [0.39517795, -0.93645388],
  mars: [1.33859641, -0.34523724],
  jupiter: [-2.01068663, 4.81900058],
  saturn: [3.77716893, -9.27024121],
  uranus: [2.67083599, -19.23005855],
  neptune: [6.98627899, -29.38358507],
};

test('planet longitudes match JPL Horizons to within 0.5 degrees', () => {
  const sky = skyOn('1990-07-15');
  for (const [name, [x, y]] of Object.entries(HORIZONS)) {
    const ref = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
    let d = Math.abs(sky.planets[name].lon - ref);
    if (d > 180) d = 360 - d;
    assert.ok(d < 0.5, `${name}: ${sky.planets[name].lon.toFixed(3)} vs ${ref.toFixed(3)}`);
  }
});

test('moon phases around known new/full moons', () => {
  const T = (iso) => (julianDay(new Date(iso)) - 2451545) / 36525;
  const near = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  assert.ok(near(moonElongation(T('2000-01-06T18:14:00Z')), 0) < 4);
  assert.ok(near(moonElongation(T('2000-01-21T04:40:00Z')), 180) < 4);
  assert.ok(near(moonElongation(T('2024-04-08T18:21:00Z')), 0) < 4); // total solar eclipse
});

test('date validation', () => {
  assert.ok(parseDate('2000-02-29'));
  assert.equal(parseDate('2001-02-29'), null);
  assert.equal(parseDate('1799-12-31'), null);
  assert.equal(parseDate('2051-01-01'), null);
  assert.equal(parseDate('nope'), null);
});
