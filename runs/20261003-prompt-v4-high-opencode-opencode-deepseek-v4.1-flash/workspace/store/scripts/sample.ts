import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderDesignPreview } from '../lib/render-design';

const outDir = join(process.cwd(), 'samples');
mkdirSync(outDir, { recursive: true });

const samples = [
  { name: 'Ava Chen', word: 'Become', palette: 'aurora', style: 'topo', shirt: 'black' },
  { name: 'Leo Marchetti', word: 'Unbound', palette: 'solar', style: 'rays', shirt: 'black' },
  { name: 'Priya', word: 'Steady', palette: 'orchid', style: 'orbit', shirt: 'black' },
  { name: 'The Okafor Family', word: 'Rooted', palette: 'jade', style: 'topo', shirt: 'white' },
  { name: 'Nova', word: 'Shine', palette: 'gold', style: 'rays', shirt: 'black' },
  { name: 'James & Ada', word: 'Always', palette: 'ocean', style: 'topo', shirt: 'white' },
];

async function main() {
  for (const s of samples) {
    const png = await renderDesignPreview(s as never, 820);
    const file = join(outDir, `${s.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${s.style}-${s.palette}.png`);
    writeFileSync(file, png);
    console.log(`${file} ${(png.length / 1024).toFixed(0)}KB`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
