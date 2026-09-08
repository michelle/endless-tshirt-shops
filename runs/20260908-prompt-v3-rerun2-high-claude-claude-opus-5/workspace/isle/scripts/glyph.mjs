import fs from 'node:fs';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
const base = '/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.0FnTKd/isle';
await initWasm(fs.readFileSync(`${base}/assets/resvg.wasm`));
const fonts = ['IMFellEnglish-Regular','IMFellEnglish-Italic','IMFellEnglishSC-Regular']
  .map(f => fs.readFileSync(`${base}/assets/fonts/${f}.ttf`));
const rows = ['ABC abc 123 .,!?-','ÀÉÎÕÜ àéîõü ÑÇ ñç','ŁŚŻ ĄĘ ŘŠŽ ĞİŞ','日本語 한국어 Привет العربية','emoji: ★ ♥ → °'];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 320" width="900" height="320"><rect width="900" height="320" fill="#F3ECE0"/>` +
  rows.map((r,i)=>`<text x="30" y="${52+i*58}" font-family="'IM Fell English SC','IM Fell English'" font-size="34" fill="#16263F">${r}</text>`).join('') + '</svg>';
const png = new Resvg(svg, { font: { fontBuffers: fonts, defaultFontFamily: 'IM Fell English', loadSystemFonts: false } }).render().asPng();
fs.writeFileSync(`${base}/out/glyphs.png`, png);
console.log('ok');
