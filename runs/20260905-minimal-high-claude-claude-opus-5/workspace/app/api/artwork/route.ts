import { NextResponse } from 'next/server';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import path from 'node:path';
import {
  ARTWORK_ASPECT,
  MAX_ARTWORK_WIDTH,
  MIN_ARTWORK_WIDTH,
  drawArtwork,
  isValidTimestamp,
} from '@/lib/artwork';
import { verifyArtwork } from '@/lib/signing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The print file.
 *
 * Deterministic: the same timestamp always renders the same PNG, so there is
 * nothing to store. Prodigi fetches this URL directly when it prints the
 * shirt, which is why it lives behind a signature rather than an auth header.
 */

let fontsReady = false;
function ensureFonts() {
  if (fontsReady) return;
  const file = path.join(process.cwd(), 'assets', 'Chivo.ttf');
  if (!GlobalFonts.registerFromPath(file, 'Chivo')) {
    throw new Error(`Could not register print font at ${file}`);
  }
  fontsReady = true;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ts = Number(url.searchParams.get('ts'));
  const width = Number(url.searchParams.get('w'));
  const sig = url.searchParams.get('sig') ?? '';

  if (!isValidTimestamp(ts)) {
    return NextResponse.json({ error: 'Invalid timestamp' }, { status: 400 });
  }
  if (
    !Number.isInteger(width) ||
    width < MIN_ARTWORK_WIDTH ||
    width > MAX_ARTWORK_WIDTH
  ) {
    return NextResponse.json({ error: 'Invalid width' }, { status: 400 });
  }
  if (!verifyArtwork(ts, width, sig)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  ensureFonts();

  const height = Math.round(width / ARTWORK_ASPECT);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  drawArtwork(ctx as never, width, ts);

  const png = await canvas.encode('png');

  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(png.length),
      // The render is a pure function of the query string, so it is safe to
      // cache forever at the edge — which also keeps this from being abused.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': `inline; filename="datetime-${ts}.png"`,
    },
  });
}
