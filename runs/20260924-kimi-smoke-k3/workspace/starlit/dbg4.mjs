import * as opentype from 'opentype.js';
import fs from 'fs';
const buf = fs.readFileSync('lib/fonts/JosefinSans.ttf');
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
for (const ch of ['R','A','P','B']) {
  const g = font.charToGlyph(ch);
  const d = g.getPath(0, 0, 40).toPathData(2);
  console.log(ch, '→', d.slice(0, 300));
  console.log('---');
}
