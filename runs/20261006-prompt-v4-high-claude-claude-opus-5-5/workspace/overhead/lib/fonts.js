import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../public/vendor/opentype.mjs';

let cache;
const load = (name) => {
  const buf = fs.readFileSync(path.join(process.cwd(), 'public', 'fonts', name));
  return parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};

export function getFonts() {
  cache ||= { serif: load('cormorant-600.ttf'), sans: load('jost-400.ttf'), sansMedium: load('jost-500.ttf') };
  return cache;
}
