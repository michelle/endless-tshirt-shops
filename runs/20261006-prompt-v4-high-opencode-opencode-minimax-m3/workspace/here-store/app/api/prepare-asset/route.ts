import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { renderDesign } from '@/lib/design-renderer';
import { assetCache } from '@/lib/asset-cache';
import { SHIRTS, SHIRT_SKU, INK_HEX } from '@/lib/products';
import { z } from 'zod';
import type { DesignConfig } from '@/lib/types';

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
  color: z.enum(SHIRTS.map((s) => s.color) as [string, ...string[]]),
});

/**
 * Used by the live preview UI: pre-renders the production-quality PNG
 * for a particular design and stores it in the local asset cache.
 *
 * Returns a relative URL that the browser can request for a quick
 * preview (we expose /api/asset/[tokenId] which renders on demand).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const v = parsed.data;
  const shirt = SHIRTS.find((s) => s.color === v.color);
  if (!shirt) return NextResponse.json({ error: 'color' }, { status: 400 });
  const inkColor = shirt.ink === 'light' ? INK_HEX.light : INK_HEX.dark;
  const background = shirt.ink === 'light' ? 'dark' : 'light';
  const design: DesignConfig = {
    label: v.label, city: v.city,
    latitude: v.lat, longitude: v.lng,
    year: v.year, personalName: v.name,
    variant: v.variant,
  };
  const { png, width, height } = await renderDesign({ design, inkColor, background });
  const tokenId = uuidv4();
  assetCache.set(`${SHIRT_SKU}|${v.color}|${tokenId}`, tokenId, png, width, height);
  return NextResponse.json({ tokenId, url: `/api/asset/${tokenId}` });
}
