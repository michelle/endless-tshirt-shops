// Local verification: render one print PNG per style through the real print pipeline.
import sharp from 'sharp';
import { designToPrintSvg, PRINT_HEIGHT, PRINT_WIDTH } from '../lib/print-svg';
import { INKS } from '../lib/catalog';

const samples: [string, Parameters<typeof designToPrintSvg>[1], string][] = [
  ['MANTRA', 'monolith', 'chalk'],
  ['WANDERLUST', 'monolith', 'marigold'],
  ['ROAM', 'echo', 'crimson'],
  ['Wild & Free', 'heritage', 'forest'],
  ['ROAM', 'arc', 'sky'],
];

async function main() {
  for (const [text, style, ink] of samples) {
    const svg = designToPrintSvg(text, style, INKS[ink].hex);
    const png = await sharp(Buffer.from(svg), { limitInputPixels: false })
      .resize(PRINT_WIDTH, PRINT_HEIGHT)
      .png()
      .toBuffer();
    const file = `/tmp/print-${style}-${text.replace(/[^a-z0-9]/gi, '')}.png`;
    await sharp(png).toFile(file);
    const stats = await sharp(png).stats();
    const meta = await sharp(png).metadata();
    console.log(
      `${file} ${meta.width}x${meta.height} stddev=${stats.channels.map((c) => c.stdev.toFixed(1)).join(',')}`
    );
    // also a small preview on dark bg for viewing
    await sharp(png)
      .resize(700)
      .flatten({ background: '#171717' })
      .toFile(file.replace('.png', '-preview.png'));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
