import test from 'node:test';
import assert from 'node:assert/strict';
import { moonPhase, moonName, hourSky, renderSVG, SHIRTS, describeDay } from '../public/lib/dayprint.js';

process.env.ART_SIGNING_SECRET = 't'.repeat(40);
const { validateSpec, encodeSpec, decodeSpec, sign, verify, specToMetadata, specFromMetadata, artUrl } = await import('../lib/spec.js');

const sampleDay = {
  place: { name: 'Portland', admin1: 'Oregon', country: 'United States', countryCode: 'US', lat: 45.5235, lon: -122.6762 },
  date: '1991-06-14', unit: 'F',
  hourly: {
    temp: [49.3,48.3,47.5,46.9,46.5,46.3,46.9,48.3,49.9,51.9,54,55.3,57.3,59.4,61.1,63.3,64.4,64.4,64.3,63.5,61.1,58.4,55.4,53.8],
    precip: Array(24).fill(0).map((_, i) => (i === 14 ? 2.2 : 0)),
    cloud: [31,33,52,48,50,55,54,61,60,99,98,100,100,100,99,100,91,62,32,9,13,13,19,16],
    wind: Array(24).fill(5), code: [1,1,2,2,2,2,2,2,2,3,3,3,3,3,61,3,3,2,1,0,0,0,0,0],
  },
  daily: { sunrise: '1991-06-14T05:21', sunset: '1991-06-14T21:00', precipSum: 2.2, daylightMinutes: 939 },
};
const goodSpec = { place: sampleDay.place, date: '1991-06-14', unit: 'F', shirt: 'black', size: 'l', caption: 'The day you were born' };

test('moon phase: known full moon 2024-01-25 and new moon 2024-01-11', () => {
  assert.ok(Math.abs(moonPhase('2024-01-25') - 0.5) < 0.03, 'full');
  const nm = moonPhase('2024-01-11');
  assert.ok(nm < 0.03 || nm > 0.97, 'new');
  assert.equal(moonName(0.5), 'FULL MOON');
});

test('hourSky returns opaque hex colours, darker at night than at noon', () => {
  const night = hourSky(sampleDay, 2), noon = hourSky(sampleDay, 12);
  assert.match(night, /^#[0-9a-f]{6}$/);
  assert.match(noon, /^#[0-9a-f]{6}$/);
  const lum = (h) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
  assert.ok(lum(night) < lum(noon));
});

test('renderSVG produces a print-sized SVG with no alpha fills and the caption escaped', () => {
  const svg = renderSVG(sampleDay, { shirt: 'white', caption: 'Tom & "Jo" <3' });
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('viewBox="0 0 4680 5790"'));
  assert.ok(!/rgba\(/.test(svg) && !/fill-opacity/.test(svg), 'no translucent ink');
  assert.ok(svg.includes('Tom &amp; &quot;Jo&quot; &lt;3'));
  for (const shirt of Object.keys(SHIRTS)) assert.ok(renderSVG(sampleDay, { shirt }).length > 2000);
});

test('describeDay summarises periods', () => {
  assert.equal(describeDay(sampleDay), 'OVERCAST MORNING · RAIN AFTERNOON · MOSTLY CLEAR EVENING');
});

test('spec validation rejects bad input and normalises good input', () => {
  assert.throws(() => validateSpec({ ...goodSpec, date: '2999-01-01' }), /Choose a date/);
  assert.throws(() => validateSpec({ ...goodSpec, size: '7xl' }), /not available/);
  assert.throws(() => validateSpec({ ...goodSpec, shirt: 'plaid' }), /shirt colour/);
  assert.throws(() => validateSpec({ ...goodSpec, place: { name: 'x', lat: 999, lon: 0 } }), /Pick a place/);
  const s = validateSpec({ ...goodSpec, caption: '  too   many\nspaces ' + 'x'.repeat(100) });
  assert.equal(s.caption.length, 36);
  assert.equal(s.place.countryCode, 'US');
});

test('spec encode/sign/verify round trip; tampering fails', () => {
  const s = validateSpec(goodSpec);
  const d = encodeSpec(s);
  const sig = sign(d);
  assert.ok(verify(d, sig));
  assert.ok(!verify(d + 'x', sig));
  assert.ok(!verify(d, sig.replace(/^./, (c) => (c === 'a' ? 'b' : 'a'))));
  assert.deepEqual(decodeSpec(d), s);
  assert.match(artUrl('https://x.test/', s), /^https:\/\/x\.test\/art\/[A-Za-z0-9_-]+\/[a-f0-9]{32}\.png$/);
});

test('metadata round trip keeps every field within Stripe limits', () => {
  const s = validateSpec(goodSpec);
  const m = specToMetadata(s);
  for (const v of Object.values(m)) assert.ok(String(v).length <= 500);
  assert.deepEqual(specFromMetadata(m), s);
  assert.throws(() => specFromMetadata({}), /no Dayprint design/);
});
