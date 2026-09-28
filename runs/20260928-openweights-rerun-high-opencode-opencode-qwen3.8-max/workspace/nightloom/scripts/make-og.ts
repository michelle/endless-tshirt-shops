// Build public/og.png (1200x630) from the same design renderer used for print files.
import { Resvg } from '@resvg/resvg-js';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildDesignSvg } from '../src/lib/design';
import { cinzel400, cinzel700, plexMono, plexMonoLight } from '../src/data/fonts';
import type { DesignParams } from '../src/lib/types';

const design: DesignParams = {
  name: 'ADA',
  caption: 'the night you were born',
  date: '1994-05-14',
  time: '22:00',
  lat: 48.8566,
  lng: 2.3522,
  placeLabel: 'Paris, FR',
  palette: 'twilight',
  showLines: true,
  showLabels: true,
};

const W = 1200;
const H = 630;

const FONT_FILES: [string, Buffer][] = [
  ['Cinzel-Regular.ttf', cinzel400],
  ['Cinzel-Bold.ttf', cinzel700],
  ['IBMPlexMono-Regular.ttf', plexMono],
  ['IBMPlexMono-Light.ttf', plexMonoLight],
];
const dir = join(tmpdir(), 'nightloom-fonts');
const fontFiles = FONT_FILES.map(([name, buf]) => {
  const p = join(dir, name);
  if (!existsSync(p)) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(p, buf);
  }
  return p;
});

const inner = buildDesignSvg(design);
const chain = `
<line x1="836" y1="96" x2="902" y2="148" stroke="#E9B9CD" stroke-opacity="0.4" stroke-width="2"/>
<line x1="902" y1="148" x2="998" y2="120" stroke="#E9B9CD" stroke-opacity="0.4" stroke-width="2"/>
<line x1="998" y1="120" x2="1064" y2="204" stroke="#E9B9CD" stroke-opacity="0.4" stroke-width="2"/>
<line x1="1064" y1="204" x2="986" y2="286" stroke="#E9B9CD" stroke-opacity="0.4" stroke-width="2"/>
<circle cx="836" cy="96" r="3.4" fill="#FFF6E8"/>
<circle cx="902" cy="148" r="2.6" fill="#FFF6E8"/>
<circle cx="998" cy="120" r="4.2" fill="#FFF6E8"/>
<circle cx="1064" cy="204" r="2.8" fill="#FFF6E8"/>
<circle cx="986" cy="286" r="3.2" fill="#FFF6E8"/>`;
const cropped = inner.replace(
  'width="4680" height="5790"',
  'x="455" y="-380" width="720" height="889.6" opacity="0.98"'
);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#05081a"/>
<circle cx="1500" cy="-330" r="420" fill="#4C2160" fill-opacity="0.35"/>
<circle cx="-180" cy="760" r="330" fill="#241353" fill-opacity="0.5"/>
${cropped}
<text x="66" y="236" font-family="Cinzel" font-weight="700" font-size="104" letter-spacing="4" fill="#FCEEF2">NIGHTLOOM</text>
<text x="68" y="296" font-family="IBM Plex Mono" font-weight="300" font-size="26" letter-spacing="7" fill="#D9C2CC">WEAR THE NIGHT YOU WERE BORN</text>
<line x1="70" y1="330" x2="360" y2="330" stroke="#F0C9A2" stroke-opacity="0.6" stroke-width="2"/>
<text x="68" y="560" font-family="IBM Plex Mono" font-weight="300" font-size="22" letter-spacing="6" fill="#D9C2CC" fill-opacity="0.8">ONE-OF-ONE STAR MAP TEES</text>
<text x="68" y="596" font-family="IBM Plex Mono" font-weight="300" font-size="22" letter-spacing="6" fill="#D9C2CC" fill-opacity="0.55">DTG PRINTED TO ORDER</text>
<rect x="40" y="170" width="3" height="140" fill="#F0C9A2" fill-opacity="0.7"/>
</svg>`;

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: W },
  font: { fontFiles, loadSystemFonts: false },
});
writeFileSync(join(process.cwd(), 'public', 'og.png'), resvg.render().asPng());
console.log('og.png written');
