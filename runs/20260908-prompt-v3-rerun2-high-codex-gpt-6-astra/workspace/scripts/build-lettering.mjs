import opentype from 'opentype.js';
import fs from 'node:fs';
const output={};
for(const weight of [400,700]){const b=fs.readFileSync(`node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-${weight}-normal.woff`);const font=opentype.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));const glyphs={};for(const c of Array.from({length:95},(_,i)=>String.fromCharCode(i+32)).concat(['°'])){const g=font.charToGlyph(c);glyphs[c]={w:Math.round((g.advanceWidth/font.unitsPerEm)*1000),d:g.getPath(0,0,1000).toPathData(2)};}output[weight]=glyphs;}
fs.writeFileSync('lib/lettering.json',JSON.stringify(output));
fs.copyFileSync('node_modules/@fontsource/ibm-plex-sans/LICENSE','public/FONT-LICENSE.txt');
