import { writeFileSync } from 'node:fs';
import { renderPrint, renderMockup } from '../src/render.js';

const cases = [
  { file: 'mock-black-signal.png', opts: { message: 'Always look up', theme: 'signal', garment: 'black', variant: 0, serial: '3F9A2C' } },
  { file: 'mock-cream-ink.png', opts: { message: 'You are my favourite', dedication: 'for Maya', theme: 'ink', garment: 'cream', variant: 2, serial: 'A17B04' } },
  { file: 'mock-navy-solar.png', opts: { message: 'Here comes the sun', theme: 'solar', garment: 'navy', variant: 5, serial: 'C40E99' } },
  { file: 'mock-white-ultra.png', opts: { message: 'Stay curious', theme: 'ink', garment: 'white', variant: 3, serial: '0B2D71' } },
  { file: 'mock-maroon-ivory.png', opts: { message: 'A long and winding road', dedication: '1994 — forever', theme: 'ivory', garment: 'maroon', variant: 1, serial: '77E1AA' } },
];

for (const c of cases) {
  const buf = renderMockup(c.opts);
  writeFileSync('/tmp/' + c.file, buf);
  console.log('wrote', c.file, buf.length);
}

const print = renderPrint({ message: 'Always look up', theme: 'signal', garment: 'black', variant: 0, serial: '3F9A2C' });
writeFileSync('/tmp/print-signal.png', print);
console.log('wrote print-signal.png', print.length);
