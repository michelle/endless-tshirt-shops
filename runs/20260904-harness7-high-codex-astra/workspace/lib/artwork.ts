import sharp from 'sharp';
import * as opentype from 'opentype.js';
import fs from 'node:fs/promises';
import path from 'node:path';
let cached:Promise<opentype.Font>|undefined;
async function font(){if(!cached)cached=fs.readFile(path.join(process.cwd(),'public/fonts/IBMPlexMono-Regular.ttf')).then(b=>opentype.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength) as ArrayBuffer));return cached;}
// Outline glyphs to make the print independent of the rendering server's installed fonts.
export async function artwork(timestamp:string){if(!/^\d{13}$/.test(timestamp))throw new Error('Invalid timestamp');const f=await font();const width=4677,height=5881,textWidth=2400;const size=textWidth/f.getAdvanceWidth(timestamp,1);const glyph=f.getPath(timestamp,(width-textWidth)/2,1050,size);glyph.fill='#ffffff';const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${glyph.toSVG(3)}</svg>`;return sharp(Buffer.from(svg)).png().withMetadata({density:300}).toBuffer();}
