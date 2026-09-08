import fs from 'node:fs';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { renderChart } from '../src/lib/chart.ts';

await initWasm(fs.readFileSync(new URL('../assets/resvg.wasm', import.meta.url)));
const fonts = ['IMFellEnglish-Regular','IMFellEnglish-Italic','IMFellEnglishSC-Regular']
  .map(f => fs.readFileSync(new URL(`../assets/fonts/${f}.ttf`, import.meta.url)));

const specs = JSON.parse(fs.readFileSync(new URL('./specs.json', import.meta.url), 'utf8'));
for (const [i, s] of specs.entries()) {
  const t0 = Date.now();
  const svg = renderChart(s);
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: Number(process.env.PXW || 900) },
    font: { fontBuffers: fonts, defaultFontFamily: 'IM Fell English', loadSystemFonts: false },
    background: s.bg || 'rgba(0,0,0,0)',
  });
  const png = r.render().asPng();
  fs.writeFileSync(new URL(`../out/chart-${i}.png`, import.meta.url), png);
  console.log(`chart-${i}.png  ${(png.length/1024).toFixed(0)}KB  svg=${(svg.length/1024).toFixed(0)}KB  ${Date.now()-t0}ms`);
}
