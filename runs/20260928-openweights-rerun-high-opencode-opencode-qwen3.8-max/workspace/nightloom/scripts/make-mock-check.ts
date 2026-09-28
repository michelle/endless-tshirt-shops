// Local-only visual check: render ShirtMock + design SVG to a PNG via react-dom/server + resvg.
import { Resvg } from '@resvg/resvg-js';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildShirtMockSvg } from '../src/components/ShirtMock';
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
  palette: 'midnight',
  showLines: true,
  showLabels: true,
};

const svg = buildDesignSvg(design);
const innerSvg = buildShirtMockSvg({ garmentHex: '#141414', designSvg: svg, uid: 'chk' });

const page = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 760" width="2000" height="1520">
<rect width="1000" height="760" fill="#0a0f2b"/>
<g transform="translate(0,-120)">${innerSvg}</g>
</svg>`;

const dir = join(tmpdir(), 'nightloom-fonts');
const fontFiles = ([
  ['Cinzel-Regular.ttf', cinzel400],
  ['Cinzel-Bold.ttf', cinzel700],
  ['IBMPlexMono-Regular.ttf', plexMono],
  ['IBMPlexMono-Light.ttf', plexMonoLight],
] as [string, Buffer][]).map(([name, buf]) => {
  const p = join(dir, name);
  if (!existsSync(p)) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(p, buf);
  }
  return p;
});

const resvg = new Resvg(page, { font: { fontFiles, loadSystemFonts: false } });
writeFileSync('/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/opencode/mock-check.png', resvg.render().asPng());
console.log('mock-check.png written');
