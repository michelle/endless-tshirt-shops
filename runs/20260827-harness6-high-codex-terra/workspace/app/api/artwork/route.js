import { Resvg } from '@resvg/resvg-js';

export const runtime = 'nodejs';

function xml(value) { return String(value).replace(/[<>&'\"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c])); }

export async function GET(request) {
  const stamp = new URL(request.url).searchParams.get('stamp') || '';
  if (!/^\d{13}$/.test(stamp)) return new Response('Invalid timestamp', { status: 400 });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4677" height="5881" viewBox="0 0 4677 5881"><rect width="4677" height="5881" fill="transparent"/><text x="2338.5" y="2940.5" text-anchor="middle" dominant-baseline="middle" fill="#f8f6f0" font-family="monospace" font-size="310" font-weight="600">${xml(stamp)}</text></svg>`;
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 4677 } }).render().asPng();
  return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
