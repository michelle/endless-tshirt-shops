import { NextResponse } from 'next/server';
import { z } from 'zod';
import { STYLES, SIZES } from '@/lib/catalog';
import { checkOrigin, signMoment, safeError } from '@/lib/server';
export async function POST(request: Request) {
  try { checkOrigin(request); } catch { return NextResponse.json({ error: 'Request not allowed.' }, { status: 403 }); }
  try {
    const raw = await request.text();
    if (raw.length > 1000) return NextResponse.json({ error: 'Invalid selection.' }, { status: 400 });
    const parsed = z.object({ style: z.enum(STYLES), size: z.enum(SIZES) }).safeParse(JSON.parse(raw));
    if (!parsed.success) return NextResponse.json({ error: 'Choose an available fit and size.' }, { status: 400 });
    const moment = { ...parsed.data, timestamp: Date.now() };
    return NextResponse.json({ token: signMoment(moment), timestamp: moment.timestamp }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { safeError('capture_failed', error); return NextResponse.json({ error: 'Could not capture this moment. Please try again.' }, { status: 400 }); }
}
