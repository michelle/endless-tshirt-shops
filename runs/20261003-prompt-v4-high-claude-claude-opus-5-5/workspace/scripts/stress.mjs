import { writeFileSync } from 'node:fs';
import { normalizeDesign, GARMENTS } from '../public/js/design.js';
import { renderPrintPNG } from '../lib/render.js';
const W = 'Wwwwwwwwwwwwwwwwwwwwwwww'; // widest glyphs, 24 chars
const N = 'Mmmmmmmmmmmmmmmmmmmmmmmmmmmmmm'; // 30 chars
const st = (k) => Array.from({ length: k }, (_, i) => ({ n: i % 2 ? W : 'Short', d: i % 3 ? N : '' }));
const cases = {
  solo10: { mode: 'solo', title: 'WWWWWWWWWWWWWWWWWWWWWWWWWW', subtitle: 'W'.repeat(44), stopsA: st(10), future: 'W'.repeat(22), colorA: 'purple' },
  duoMax: { mode: 'duo', title: 'The Ångström–Ñúñez Line', subtitle: 'Shared service', stopsA: st(4), stopsB: st(4), hub: { n: W, d: N }, stopsShared: st(5), future: 'Onward', colorA: 'teal', colorB: 'pink' },
  duoMin: { mode: 'duo', title: 'Us', stopsA: st(1), stopsB: st(1), hub: { n: 'Met', d: '' }, stopsShared: [], colorA: 'red', colorB: 'blue' },
};
for (const [k, d] of Object.entries(cases)) {
  writeFileSync(`out/stress-${k}.png`, await renderPrintPNG(normalizeDesign(d), 'white', { width: 900, background: GARMENTS.white.hex }));
}
console.log('ok');
