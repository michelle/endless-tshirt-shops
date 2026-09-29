import { NextRequest, NextResponse } from 'next/server';
import { stripeClient } from '@/lib/server';
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('session_id') || '';
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
  try { const s = await stripeClient().checkout.sessions.retrieve(id); return NextResponse.json({ paid: s.payment_status === 'paid', place: s.metadata?.place || '', email: s.customer_details?.email || '' }); }
  catch { return NextResponse.json({ error: 'Order unavailable' }, { status: 404 }); }
}
