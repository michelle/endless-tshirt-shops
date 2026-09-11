import { parseAsset } from '@/lib/server';
import { printPng } from '@/lib/render';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get('token');
    if (!token) return new Response('Missing asset token', { status: 400 });
    const png = await printPng(parseAsset(token));
    return new Response(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': 'inline; filename="after-hours-print.png"',
      },
    });
  } catch {
    return new Response('Invalid print link', { status: 400 });
  }
}
