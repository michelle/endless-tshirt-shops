// Print-file renderer. GET /api/artwork?d=<signed design token>&sig=...
// Returns the print-ready PNG (4680x5790 — exact front-print resolution for
// GLOBAL-TEE-BC-3001) that Prodigi downloads, or the SVG with ?fmt=svg.
// Rendering is fully deterministic: same token, same bytes.

import { NextResponse } from 'next/server';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { buildDesignSvg, DESIGN_W } from '@/lib/design';
import { cinzel400, cinzel700, plexMono, plexMonoLight } from '@/data/fonts';
import { unpack, verify } from '@/lib/encoding';
import { validateDesign } from '@/lib/validation';
import type { DesignParams } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// resvg loads fonts from disk; materialize the embedded (base64) OFL fonts
// into a tmp dir once per serverless container.
const FONT_FILES: [string, Buffer][] = [
  ['Cinzel-Regular.ttf', cinzel400],
  ['Cinzel-Bold.ttf', cinzel700],
  ['IBMPlexMono-Regular.ttf', plexMono],
  ['IBMPlexMono-Light.ttf', plexMonoLight],
];

function fontPaths(): string[] {
  const dir = join(tmpdir(), 'nightloom-fonts');
  return FONT_FILES.map(([name, buf]) => {
    const p = join(dir, name);
    if (!existsSync(p)) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(p, buf);
    }
    return p;
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const d = url.searchParams.get('d');
  const sig = url.searchParams.get('sig');
  const fmt = url.searchParams.get('fmt') ?? 'png';

  if (!d || !sig || !verify(d, sig)) {
    return new NextResponse('invalid or unsigned design token', { status: 403 });
  }
  const design = validateDesign(unpack<DesignParams>(d));
  if (!design.ok) {
    return new NextResponse('invalid design token', { status: 422 });
  }

  const svg = buildDesignSvg(design.value);

  if (fmt === 'svg') {
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: DESIGN_W },
    font: { fontFiles: fontPaths(), loadSystemFonts: false },
    background: 'rgba(0, 0, 0, 0)',
  });
  const png = resvg.render().asPng();

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(png.byteLength),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
