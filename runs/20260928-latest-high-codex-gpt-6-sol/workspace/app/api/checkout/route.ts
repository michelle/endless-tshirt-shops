import { NextRequest, NextResponse } from 'next/server';
import { parseDesign, priceCents } from '@/lib/design';
import { stripe } from '@/lib/stripe';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({error:'Checkout is awaiting payment setup.'},{status:503});
  try {
    const design = parseDesign(await request.json());
    const base = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const session = await stripe().checkout.sessions.create({
      mode:'payment', payment_method_types:['card'],
      line_items:[{price_data:{currency:'usd',unit_amount:priceCents,product_data:{name:'Nightmark · Custom constellation tee',description:`${design.name} · ${design.place} · ${design.date} · ${design.color} / ${design.size.toUpperCase()}`}},quantity:1}],
      shipping_address_collection:{allowed_countries:['US']},
      shipping_options:[{shipping_rate_data:{type:'fixed_amount',fixed_amount:{amount:0,currency:'usd'},display_name:'Complimentary US shipping'}}],
      phone_number_collection:{enabled:true},
      customer_creation:'always',
      success_url:`${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${base}/#create`,
      metadata:{design:JSON.stringify(design)},
    });
    return NextResponse.json({url:session.url});
  } catch (e) { return NextResponse.json({error:e instanceof Error ? e.message : 'Unable to start checkout'},{status:400}); }
}
