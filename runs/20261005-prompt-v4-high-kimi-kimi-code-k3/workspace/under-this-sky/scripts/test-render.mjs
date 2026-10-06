// Renders a sample design to PNG for visual review.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { renderDesignSVG } from '../public/starmap.js';

const catalog = JSON.parse(readFileSync(new URL('../public/catalog.json', import.meta.url)));

const samples = [
  {
    name: 'dark-lisbon',
    params: {
      iso: '2019-06-14T23:30:00Z', lat: 38.7223, lon: -9.1393,
      title: 'The Night We Met', subtitle: 'Elena & Marco',
      place: 'Lisbon, Portugal', theme: 'dark',
    },
    bg: '#111',
  },
  {
    name: 'dark-sydney-birth',
    params: {
      iso: '1994-03-02T14:05:00Z', lat: -33.8688, lon: 151.2093,
      title: 'A Star Is Born', subtitle: '',
      place: 'Sydney, Australia', theme: 'dark',
    },
    bg: '#111',
  },
  {
    name: 'light-tokyo',
    params: {
      iso: '2021-07-23T12:00:00Z', lat: 35.6762, lon: 139.6503,
      title: 'Under This Sky', subtitle: 'The Games Begin',
      place: 'Tokyo, Japan', theme: 'light',
    },
    bg: '#f5f5f5',
  },
];

mkdirSync(new URL('../out', import.meta.url), { recursive: true });

for (const { name, params, bg } of samples) {
  const svg = renderDesignSVG(params, catalog, { width: 4680, height: 5790 });
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1400 },
    font: { fontFiles: [
      'fonts/CormorantGaramond-500.ttf',
      'fonts/CormorantGaramond-600.ttf',
      'fonts/CormorantGaramond-700.ttf',
    ], loadSystemFonts: false, defaultFontFamily: 'Cormorant Garamond' },
    background: bg,
  });
  const png = resvg.render().asPng();
  writeFileSync(new URL(`../out/${name}.png`, import.meta.url), png);
  console.log(`wrote out/${name}.png (${png.length} bytes)`);
}
