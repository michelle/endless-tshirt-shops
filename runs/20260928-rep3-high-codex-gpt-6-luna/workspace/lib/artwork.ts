import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { Resvg } from '@resvg/resvg-js';

const clean = (s: string, max = 28) => s.replace(/[<>"'&]/g, '').replace(/[^\p{L}\p{N} .,'!?-]/gu, '').trim().slice(0, max);
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function makeArtwork(input: { name?: string; date?: string; place?: string; bloom?: string }) {
  const name = clean(input.name || 'A night gardener', 24) || 'A night gardener';
  const date = clean(input.date || 'A night in the making', 24);
  const place = clean(input.place || 'Somewhere under the moon', 28);
  const bloom = ['moth orchid', 'moon fern', 'starflower'].includes(input.bloom || '') ? input.bloom! : 'moth orchid';
  const seed = hash(`${name}|${date}|${place}|${bloom}`);
  const hues = [['#f2bd78','#d97b65','#adc69a'], ['#e9cd91','#aa8bbd','#9ec7ba'], ['#f0a77e','#f3d89a','#9fb5dc']][seed % 3];
  const stars = Array.from({length: 44}, (_, i) => {
    const n = (seed * (i + 19) * 16807) % 2147483647;
    const x = 155 + (n % 2690), y = 210 + ((n >>> 9) % 3720), r = 5 + ((n >>> 17) % 11);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 7 ? '#f6e9d1' : hues[0]}" opacity=".${65 + n % 34}"/>`;
  }).join('');
  const petals = Array.from({length: 12}, (_, i) => `<ellipse cx="0" cy="-142" rx="52" ry="128" transform="rotate(${i*30})" fill="${i%2?hues[0]:hues[1]}" opacity=".83"/>`).join('');
  const flower = (x:number,y:number,r:number) => `<g transform="translate(${x} ${y}) scale(${r/180})">${petals}<circle r="43" fill="${hues[0]}"/><circle r="16" fill="#292138"/></g>`;
  const motif = bloom === 'moon fern'
    ? `<path d="M1770 2650 C1420 2180 1580 1660 1850 1190 C1940 1590 1970 2130 1770 2650Z" fill="none" stroke="${hues[2]}" stroke-width="24"/>${Array.from({length:9},(_,i)=>`<path d="M${1790-i*13} ${2460-i*138} Q${1370-i*10} ${2310-i*132} ${1510+i*9} ${2090-i*120}" fill="none" stroke="${hues[2]}" stroke-width="20"/>`).join('')}${flower(1930,1570,140)}${flower(1480,2110,110)}`
    : bloom === 'starflower'
      ? `${flower(1770,1850,240)}${flower(1420,2350,130)}${flower(2090,2400,150)}<path d="M1780 1900 C1730 2300 1480 2600 1510 2890 M1790 2000 C2020 2270 2100 2550 2110 2810" fill="none" stroke="${hues[2]}" stroke-width="25"/>`
      : `<path d="M1780 2630 C1780 2300 1650 2110 1500 1940 M1790 2440 C1890 2210 2100 2040 2220 1770 M1770 2310 C1630 2040 1640 1710 1710 1470" fill="none" stroke="${hues[2]}" stroke-width="25"/><path d="M1480 1910 Q1300 1810 1315 1610 Q1510 1625 1520 1820 M2150 1850 Q2210 1630 2420 1590 Q2440 1810 2210 1890 M1660 1680 Q1500 1500 1590 1310 Q1780 1420 1720 1620" fill="${hues[2]}" opacity=".9"/>${flower(1780,1210,205)}${flower(1300,2130,120)}`;
  const label = bloom.toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="3307" height="4606" viewBox="0 0 3307 4606"><defs><radialGradient id="halo"><stop stop-color="${hues[0]}" stop-opacity=".20"/><stop offset="1" stop-color="${hues[0]}" stop-opacity="0"/></radialGradient></defs><g font-family="Georgia,serif" text-anchor="middle"><circle cx="1653" cy="2220" r="1330" fill="url(#halo)"/>${stars}<path d="M600 510 Q1653 280 2707 510 M600 4110 Q1653 4340 2707 4110" fill="none" stroke="#f6e9d1" stroke-width="7" opacity=".58"/><circle cx="1653" cy="2260" r="990" fill="none" stroke="#f6e9d1" stroke-width="5" stroke-dasharray="3 28" opacity=".6"/><text x="1653" y="710" fill="#f6e9d1" font-size="74" letter-spacing="22">THE LITTLE NIGHT GARDEN</text><text x="1653" y="980" fill="${hues[0]}" font-size="48" letter-spacing="15">A ONE-OF-A-KIND FIELD STUDY</text><path d="M1110 1035h1086" stroke="#f6e9d1" stroke-width="3" opacity=".45"/>${motif}<g transform="translate(1653 3250)" fill="none" stroke="#f6e9d1" stroke-width="12" opacity=".86"><path d="M-180 0 Q0 -210 180 0 Q0 210 -180 0Z"/><circle r="55"/><path d="M-300 0h-220m1040 0H300M0 -340v-210m0 1100v-210"/></g><text x="1653" y="3650" fill="#f6e9d1" font-size="110" letter-spacing="4">${escape(name)}</text><text x="1653" y="3760" fill="${hues[0]}" font-size="45" letter-spacing="9">${escape(label)} · PERSONAL SPECIMEN</text><text x="1653" y="3930" fill="#f6e9d1" font-size="42" letter-spacing="5">${escape(place)}${date ? ` · ${escape(date)}` : ''}</text><text x="1653" y="4210" fill="#f6e9d1" font-size="34" letter-spacing="13" opacity=".7">GROWN FROM YOUR OWN LITTLE UNIVERSE</text></g></svg>`;
  return new Resvg(svg, { fitTo: { mode: 'width', value: 3307 } }).render().asPng();
}

export function cleanCustomization(data: any) {
  return { name: clean(String(data?.name || ''), 24), date: clean(String(data?.date || ''), 24), place: clean(String(data?.place || ''), 28), bloom: ['moth orchid', 'moon fern', 'starflower'].includes(data?.bloom) ? data.bloom : 'moth orchid' };
}

const tokenKey = () => {
  const secret = process.env.ARTWORK_TOKEN_SECRET;
  if (!secret) throw new Error('ARTWORK_TOKEN_SECRET is not configured');
  return createHash('sha256').update(secret).digest();
};
export function sealCustomization(input: ReturnType<typeof cleanCustomization>) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', tokenKey(), iv);
  const payload = Buffer.from(JSON.stringify({ ...input, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 }));
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
export function openCustomization(token: string) {
  try {
    const packed = Buffer.from(token, 'base64url');
    if (packed.length < 29) return null;
    const decipher = createDecipheriv('aes-256-gcm', tokenKey(), packed.subarray(0, 12));
    decipher.setAuthTag(packed.subarray(12, 28));
    const data = JSON.parse(Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return cleanCustomization(data);
  } catch { return null; }
}
