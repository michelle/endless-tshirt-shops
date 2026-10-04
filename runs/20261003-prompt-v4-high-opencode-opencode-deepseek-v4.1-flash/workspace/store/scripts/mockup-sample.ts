import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderMockupPng } from '../lib/mockup';

const outDir = join(process.cwd(), 'samples');
mkdirSync(outDir, { recursive: true });

const samples = [
  { name: 'Ava Chen', word: 'Become', palette: 'aurora', style: 'topo', shirt: 'black' },
  { name: 'Ava Chen', word: 'Become', palette: 'aurora', style: 'topo', shirt: 'white' },
  { name: 'Leo Marchetti', word: 'Unbound', palette: 'solar', style: 'rays', shirt: 'black' },
  { name: 'Priya', word: 'Steady', palette: 'orchid', style: 'orbit', shirt: 'white' },
];

async function main() {
  for (const s of samples) {
    const png = await renderMockupPng(s as never, 620);
    const file = join(outDir, `mockup-${s.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${s.shirt}.png`);
    writeFileSync(file, png);
    console.log(file, (png.length / 1024).toFixed(0) + 'KB');
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
