export type Design = { name: string; place: string; date: string; note: string; color: 'black' | 'navy blue' | 'cream'; size: 's' | 'm' | 'l' | 'xl' | '2xl' };
export const defaultDesign: Design = { name: 'OUR FIRST NIGHT', place: 'BROOKLYN, NEW YORK', date: '2024-06-21', note: 'WHERE EVERYTHING BEGAN', color: 'black', size: 'm' };
export const colors = { black: '#151718', 'navy blue': '#202d46', cream: '#e8dfc9' };
export const priceCents = 4200;
export function parseDesign(data: unknown): Design {
  if (!data || typeof data !== 'object') throw new Error('Invalid design');
  const x = data as Record<string, unknown>;
  const str = (key: string, max: number) => {
    if (typeof x[key] !== 'string') throw new Error(`Invalid ${key}`);
    const value = x[key].trim().replace(/\s+/g, ' ');
    if (!value || value.length > max || /[<>\x00-\x1f]/.test(value)) throw new Error(`Invalid ${key}`);
    return value;
  };
  const name = str('name', 26);
  const place = str('place', 32);
  const note = str('note', 38);
  const date = str('date', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw new Error('Invalid date');
  if (!Object.keys(colors).includes(String(x.color))) throw new Error('Invalid color');
  if (!['s','m','l','xl','2xl'].includes(String(x.size))) throw new Error('Invalid size');
  return { name, place, note, date, color: x.color as Design['color'], size: x.size as Design['size'] };
}
const escape = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
function random(seed: number) { let n = seed >>> 0; return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; }; }
function hash(s: string) { let n = 2166136261; for (const c of s) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; }
export function artSvg(d: Design): string {
  const light = d.color === 'cream';
  const ink = light ? '#202a29' : '#f2e9cf';
  const muted = light ? '#59605b' : '#b9bba9';
  const accent = light ? '#a04e2e' : '#e8b778';
  const rng = random(hash(`${d.name}|${d.place}|${d.date}|${d.note}`));
  const points = Array.from({length: 7}, (_, i) => ({ x: 385 + i * 115 + (rng()-.5)*75, y: 820 + Math.sin(i*1.25)*130 + (rng()-.5)*220 }));
  const lines = points.slice(1).map((p,i) => `<line x1="${points[i].x.toFixed(0)}" y1="${points[i].y.toFixed(0)}" x2="${p.x.toFixed(0)}" y2="${p.y.toFixed(0)}" stroke="${ink}" stroke-width="2" opacity=".64"/>`).join('');
  const stars = Array.from({length: 62}, () => { const x=190+rng()*820,y=420+rng()*840,r=rng()>0.88?3.5:1.7; return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${ink}" opacity="${(.28+rng()*.62).toFixed(2)}"/>`; }).join('');
  const nodes = points.map((p,i)=>`<circle cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" r="${i===3?13:8}" fill="${accent}"/><circle cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" r="${i===3?22:16}" fill="none" stroke="${ink}" opacity=".65" stroke-width="1.5"/>`).join('');
  const year = d.date.slice(0,4); const formatted = new Date(`${d.date}T12:00:00Z`).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600"><g fill="none"><circle cx="600" cy="820" r="415" stroke="${ink}" stroke-width="2" opacity=".68"/><circle cx="600" cy="820" r="352" stroke="${ink}" stroke-width="1" opacity=".26"/><circle cx="600" cy="820" r="272" stroke="${ink}" stroke-width="1" opacity=".2"/><path d="M 185 820 H 1015 M 600 405 V 1235" stroke="${ink}" stroke-width="1" opacity=".2"/>${lines}</g>${stars}${nodes}<g fill="${ink}" text-anchor="middle"><text x="600" y="266" font-size="28" font-family="sans-serif" letter-spacing="13">NIGHTMARK  /  ${escape(year)}</text><text x="600" y="348" font-size="59" font-family="serif" letter-spacing="3">${escape(d.name.toUpperCase())}</text><text x="600" y="1330" font-size="25" font-family="sans-serif" letter-spacing="9">${escape(d.place.toUpperCase())}</text><text x="600" y="1392" font-size="23" font-family="sans-serif" letter-spacing="6" fill="${muted}">${escape(formatted)}</text><text x="600" y="1515" font-size="25" font-family="serif" font-style="italic" fill="${accent}">${escape(d.note)}</text></g><path d="M390 1435 H810" stroke="${ink}" stroke-width="2" opacity=".55"/></svg>`;
}
