import { NextRequest, NextResponse } from 'next/server';
import { generateCelestialSvg } from '@/lib/generator';
import { renderSvgToPng } from '@/lib/renderer';
import { getOrder } from '@/lib/orderStore';
import { DesignParams } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Allow sufficient time for 4677x5881 print rendering

const DEFAULT_PARAMS: DesignParams = {
  title: 'THE NIGHT WE MET',
  dedication: 'Under a thousand burning stars, written forever in the celestial sphere.',
  city: 'Paris, France',
  lat: 48.8566,
  lng: 2.3522,
  date: '2024-05-18T22:30:00.000Z',
  color: 'black',
  style: 'gold',
  size: 'l',
  showConstellations: true,
  showCoordinates: true,
  showMoon: true,
  showGrid: true
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let rawId = params.id;
    const isPng = rawId.endsWith('.png');
    const isSvg = rawId.endsWith('.svg');

    // Strip extension
    rawId = rawId.replace(/\.(png|svg)$/i, '');

    let designParams: DesignParams = { ...DEFAULT_PARAMS };

    if (rawId.startsWith('d_')) {
      try {
        const jsonStr = Buffer.from(rawId.substring(2), 'base64url').toString('utf8');
        const parsed = JSON.parse(jsonStr);
        designParams = { ...DEFAULT_PARAMS, ...parsed };
      } catch (err) {
        console.error('Failed to parse base64 design params:', err);
      }
    } else {
      const order = getOrder(rawId);
      if (order && order.designParams) {
        designParams = { ...DEFAULT_PARAMS, ...order.designParams };
      }
    }

    // Check if web preview scale was requested via query
    const url = new URL(req.url);
    const widthParam = url.searchParams.get('w');
    const width = widthParam ? parseInt(widthParam, 10) : 4677;
    const height = Math.round(width * (5881 / 4677));

    const svg = generateCelestialSvg(designParams, {
      width,
      height,
      isPrintReady: width >= 4000
    });

    if (isSvg) {
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400, s-maxage=31536000'
        }
      });
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${proto}://${host}`;

    // Render PNG
    const pngBuffer = await renderSvgToPng(svg, width, origin);

    return new NextResponse(new Uint8Array(pngBuffer) as any, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pngBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400, s-maxage=31536000'
      }
    });
  } catch (error: any) {
    console.error('Error generating design asset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to render design asset' },
      { status: 500 }
    );
  }
}
