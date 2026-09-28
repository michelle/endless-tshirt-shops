import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('session_id');
  if (!id || !/^cs_(test_)?[A-Za-z0-9]+$/.test(id) || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({status:'unavailable'},{status:400});
  try { const session = await stripe().checkout.sessions.retrieve(id); return NextResponse.json({status:session.payment_status,number:id.slice(-8).toUpperCase()}); }
  catch { return NextResponse.json({status:'unavailable'},{status:404}); }
}
