export const PRODUCT = {
  name: 'The Moment Map Tee',
  sku: 'GLOBAL-TEE-BC-3001',
  price: 3900,
  shipping: 500,
  currency: 'usd',
} as const;

export const COLORS = { black: '#171b23', 'navy blue': '#1c3044' } as const;
export const SIZES = ['s', 'm', 'l', 'xl', '2xl'] as const;
export type Design = { place: string; date: string; message: string; color: keyof typeof COLORS; size: typeof SIZES[number] };

export function parseDesign(value: unknown): Design {
  if (!value || typeof value !== 'object') throw new Error('Missing design');
  const x = value as Record<string, unknown>;
  const place = String(x.place ?? '').trim().replace(/\s+/g, ' ');
  const date = String(x.date ?? '').trim();
  const message = String(x.message ?? '').trim().replace(/\s+/g, ' ');
  const color = String(x.color ?? '') as keyof typeof COLORS;
  const size = String(x.size ?? '') as Design['size'];
  if (!place || place.length > 28 || /[<>\r\n]/.test(place)) throw new Error('Place must be 1–28 characters');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0,10) !== date) throw new Error('Choose a valid date');
  if (!message || message.length > 42 || /[<>\r\n]/.test(message)) throw new Error('Message must be 1–42 characters');
  if (!(color in COLORS)) throw new Error('Choose a shirt color');
  if (!SIZES.includes(size)) throw new Error('Choose a size');
  return { place, date, message, color, size };
}

export function escapeXml(s: string) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!)); }

export function designSvg(d: Design): string {
  const place = escapeXml(d.place.toUpperCase());
  const message = escapeXml(d.message.toUpperCase());
  const date = new Date(`${d.date}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: '2-digit', year: 'numeric' }).toUpperCase();
  const seed = [...(d.place + d.date + d.message)].reduce((n,c) => ((n * 31 + c.charCodeAt(0)) >>> 0), 7);
  const phase = (seed % 80) - 40;
  const ridge = Array.from({length: 8}, (_, i) => {
    const y = 1500 + i * 74;
    const amp = 25 + i * 11;
    return `<path d="M 230 ${y} C 570 ${y - amp + phase}, 700 ${y + amp}, 1050 ${y - 30} S 1620 ${y + amp + phase}, 2170 ${y - 15}" fill="none" stroke="#F6CF9E" stroke-width="${i === 0 ? 7 : 4}" opacity="${1 - i * .085}"/>`;
  }).join('');
  const stars = Array.from({length: 18}, (_, i) => {
    const x = 220 + ((seed + i * 3947) % 1960);
    const y = 410 + (((seed >>> 3) + i * 1867) % 990);
    const r = i % 5 === 0 ? 7 : 3;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#F8EBCF" opacity=".8"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="3600" height="4500" viewBox="0 0 2400 3000">
  <defs><clipPath id="horizon"><circle cx="1200" cy="1250" r="870"/></clipPath></defs>
  <g fill="none" stroke="#F8EBCF" stroke-width="5" opacity=".82"><circle cx="1200" cy="1250" r="870"/><circle cx="1200" cy="1250" r="810"/><path d="M 1200 280 V 350 M 1200 2150 V 2220 M 180 1250 H 280 M 2120 1250 H 2220"/></g>
  <g clip-path="url(#horizon)">${stars}<circle cx="1200" cy="1120" r="495" fill="#EE957F"/><circle cx="1200" cy="1120" r="385" fill="#F5B889"/><circle cx="1200" cy="1120" r="274" fill="#F7D5A2"/><path d="M 100 1460 C 500 1390 780 1510 1150 1440 S 1870 1400 2300 1490 L 2300 2300 H 100 Z" fill="#236A79"/><path d="M 100 1580 C 510 1500 740 1660 1150 1560 S 1870 1540 2300 1620 L 2300 2300 H 100 Z" fill="#174C61"/>${ridge}</g>
  <path d="M 460 2250 H 1940" stroke="#F8EBCF" stroke-width="4" opacity=".8"/>
  <text x="1200" y="2400" text-anchor="middle" fill="#F8EBCF" font-family="Arial,Helvetica,sans-serif" font-size="${d.place.length > 21 ? 94 : 123}" font-weight="800" letter-spacing="8">${place}</text>
  <text x="1200" y="2518" text-anchor="middle" fill="#F5B889" font-family="Arial,Helvetica,sans-serif" font-size="57" font-weight="700" letter-spacing="12">${escapeXml(date)}</text>
  <text x="1200" y="2660" text-anchor="middle" fill="#F8EBCF" font-family="Arial,Helvetica,sans-serif" font-size="${d.message.length > 31 ? 46 : 57}" font-weight="500" letter-spacing="5">${message}</text>
  <text x="1200" y="2790" text-anchor="middle" fill="#F8EBCF" font-family="Arial,Helvetica,sans-serif" font-size="35" letter-spacing="14" opacity=".7">ONE MOMENT • ALL YOURS</text>
  </svg>`;
}
