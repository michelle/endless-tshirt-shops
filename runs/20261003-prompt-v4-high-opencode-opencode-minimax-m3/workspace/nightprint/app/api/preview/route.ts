/**
 * /api/preview - Design preview generator.
 *   Accepts a JSON DesignInput body and returns an SVG (text) or PNG (image/png).
 *   Used by the /design page live-preview pane, and the success page renderer.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSvg, PRINT_W, PRINT_H, PREVIEW_W, PREVIEW_H } from '@/lib/design';
import type { DesignInput } from '@/lib/design';
// Resvg loaded lazily because it carries a WASM binary that doesn't always
// initialize cleanly inside Vercel's Node.js serverless runtime; we
// dynamically import the module inside the handler so cold-start failures
// surface as 500s rather than nuking the entire route.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DesignInputSchema = z.object({
  when: z.union([z.string().datetime(), z.string(), z.number()]),
  latitudeDeg: z.number(),
  longitudeDeg: z.number(),
  locationName: z.string().max(120),
  message: z.string().max(400),
  headline: z.string().max(80).optional(),
  palette: z.enum(['ink', 'ivory', 'rose', 'sage']).optional(),
});

function parseDesign(json: unknown): DesignInput {
  const parsed = DesignInputSchema.parse(json);
  const when =
    typeof parsed.when === 'number'
      ? new Date(parsed.when)
      : new Date(parsed.when);
  return {
    when,
    latitudeDeg: parsed.latitudeDeg,
    longitudeDeg: parsed.longitudeDeg,
    locationName: parsed.locationName,
    message: parsed.message,
    headline: parsed.headline,
    palette: parsed.palette,
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  let design: DesignInput;
  try {
    design = parseDesign(body);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'invalid input' }, { status: 400 });
  }

  const url = new URL(req.url);
  const format = (url.searchParams.get('format') ?? 'svg').toLowerCase();
  const size = (url.searchParams.get('size') ?? 'preview').toLowerCase();

  try {
    if (format === 'svg') {
      const dims = size === 'print' ? { width: PRINT_W, height: PRINT_H } : { width: PREVIEW_W, height: PREVIEW_H };
      const { svg } = generateSvg(design, dims);
      return new NextResponse(svg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    if (format === 'png') {
      const svgDims = size === 'print' ? { width: PRINT_W, height: PRINT_H } : { width: PREVIEW_W, height: PREVIEW_H };
      const { svg } = generateSvg(design, svgDims);
      const { Resvg } = await import('@resvg/resvg-js');
      const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: svgDims.width },
        background: 'rgba(0,0,0,0)',
      });
      const png = resvg.render().asPng();
      const ab: ArrayBuffer = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;
      return new NextResponse(ab, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.json({ error: 'format must be svg or png' }, { status: 400 });
  } catch (err: any) {
    if (process.env.STARPRINT_DEBUG) {
      return NextResponse.json(
        { error: 'render failed: ' + (err?.message ?? 'unknown'), stack: err?.stack },
        { status: 500 }
      );
    }
    throw err;
  }
}

export async function GET(req: Request) {
  // Convenience GET for simple cases (works behind CDN; only used in dev).
  const url = new URL(req.url);
  const format = (url.searchParams.get('format') ?? 'svg').toLowerCase();
  const designInput: DesignInput = {
    when: new Date(),
    latitudeDeg: Number(url.searchParams.get('lat') ?? 48.8566),
    longitudeDeg: Number(url.searchParams.get('lng') ?? 2.3522),
    locationName: url.searchParams.get('loc') ?? 'Paris, France',
    message: url.searchParams.get('msg') ?? 'Your moment,\nunder our sky.',
    headline: url.searchParams.get('headline') ?? 'The Night Sky',
    palette: (url.searchParams.get('palette') as DesignInput['palette']) ?? 'ink',
  };
  if (format === 'svg') {
    const { svg } = generateSvg(designInput, { width: PREVIEW_W, height: PREVIEW_H });
    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }
  return NextResponse.json({ error: 'unsupported via GET; POST for png' }, { status: 400 });
}
