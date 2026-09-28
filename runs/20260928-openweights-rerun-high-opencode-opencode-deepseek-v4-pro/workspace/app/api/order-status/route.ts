import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Prodigi order-status callback. We acknowledge every event; in a production
// build this would persist the status and surface it to the customer.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  console.log('Prodigi order-status callback', JSON.stringify(body));
  return NextResponse.json({ received: true });
}
