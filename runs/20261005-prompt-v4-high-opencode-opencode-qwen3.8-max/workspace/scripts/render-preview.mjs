// Renders sample designs to .preview/*.png for visual inspection.
//   node scripts/render-preview.mjs
import { buildDesignSVG, PRINT_W, SHIRTS } from '../public/lib/design.mjs';
import { renderSVGtoPNG } from '../lib/render.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('.preview', { recursive: true });

const samples = [
  {
    name: 'paris-dark', shirt: 'black',
    p: {
      lat: 48.8566, lon: 2.3522,
      place: { city: 'Paris', admin1: 'Île-de-France', country: 'France' },
      markers: [{ md: '06-14', label: 'BORN' }, { md: '09-02', label: 'MET' }],
      dedication: 'for Marie', variant: 'dark',
    },
  },
  {
    name: 'paris-light', shirt: 'white',
    p: {
      lat: 48.8566, lon: 2.3522,
      place: { city: 'Paris', admin1: 'Île-de-France', country: 'France' },
      markers: [{ md: '06-14', label: 'BORN' }, { md: '09-02', label: 'MET' }],
      dedication: 'for Marie', variant: 'light',
    },
  },
  {
    name: 'reykjavik-dark', shirt: 'navy',
    p: {
      lat: 64.1466, lon: -21.9426,
      place: { city: 'Reykjavík', country: 'Iceland' },
      markers: [{ md: '12-21', label: 'HOME' }],
      dedication: '', variant: 'dark',
    },
  },
  {
    name: 'tromso-dark', shirt: 'black',
    p: {
      lat: 69.6492, lon: 18.9553,
      place: { city: 'Tromsø', country: 'Norway' },
      markers: [], dedication: '69° north', variant: 'dark',
    },
  },
  {
    name: 'quito-light', shirt: 'cream',
    p: {
      lat: -0.1807, lon: -78.4678,
      place: { city: 'Quito', country: 'Ecuador' },
      markers: [{ md: '03-20', label: 'EQUINOX' }],
      dedication: '', variant: 'light',
    },
  },
  {
    name: 'ushuaia-light', shirt: 'heather',
    p: {
      lat: -54.8019, lon: -68.303,
      place: { city: 'Ushuaia', admin1: 'Tierra del Fuego', country: 'Argentina' },
      markers: [], dedication: 'the end of the world', variant: 'light',
    },
  },
];

for (const s of samples) {
  const svg = buildDesignSVG(s.p);
  writeFileSync(`.preview/${s.name}.svg`, svg);
  const shirt = SHIRTS[s.shirt] || SHIRTS.black;
  const png = renderSVGtoPNG(svg, 1170, shirt.hex); // quarter scale, shirt-coloured bg
  writeFileSync(`.preview/${s.name}.png`, png);
  const full = renderSVGtoPNG(svg, PRINT_W);
  writeFileSync(`.preview/${s.name}-full.png`, full);
  console.log(s.name, 'svg', (svg.length / 1024).toFixed(0) + 'KB', '| preview', (png.length / 1024).toFixed(0) + 'KB', '| full', (full.length / 1024).toFixed(0) + 'KB');
}
