import { NextRequest, NextResponse } from 'next/server';
import { renderDesign } from '@/lib/design-renderer';
import { PRINT_AREA_WIDTH_PX } from '@/lib/products';
import type { DesignConfig } from '@/lib/types';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Schema = z.object({
  label: z.string().max(60).default('Where We Met'),
  city: z.string().max(80).default('Paris, France'),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  year: z.string().max(4).default(''),
  name: z.string().max(20).default(''),
  variant: z.enum(['classic', 'minimal', 'nautical']).default('classic'),
  ink: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#0c0c0d'),
  bg: z.enum(['light', 'dark']).default('light'),
});

const cache = new Map<string, { ts: number; buf: Buffer }>();
const CACHE_MS = 5 * 60 * 1000;
const CACHE_LIMIT = 80;

function gc(now: number) {
  if (cache.size <= CACHE_LIMIT) return;
  const entries = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts);
  for (const [k] of entries.slice(0, cache.size - CACHE_LIMIT)) cache.delete(k);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams);
  const parsed = Schema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters', issues: parsed.error.flatten() }, { status: 400 });
  }
  const v = parsed.data;
  const cacheKey = `${v.label}|${v.city}|${v.lat}|${v.lng}|${v.year}|${v.name}|${v.variant}|${v.ink}|${v.bg}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && now - cached.ts < CACHE_MS) {
    return new NextResponse(new Uint8Array(cached.buf), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  const design: DesignConfig = {
    label: v.label,
    city: v.city,
    latitude: v.lat,
    longitude: v.lng,
    year: v.year,
    personalName: v.name,
    variant: v.variant,
  };

  try {
    const { png } = await renderDesign({ design, inkColor: v.ink, background: v.bg });
    cache.set(cacheKey, { ts: now, buf: png });
    gc(now);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300',
        'X-Print-Width-Px': String(PRINT_AREA_WIDTH_PX),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'render failed', message: String(e?.message ?? e) }, { status: 500 });
  }
}
