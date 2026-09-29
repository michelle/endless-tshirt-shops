import Stripe from 'stripe';
import { cleanCustomization } from '@/lib/artwork';
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
const stripeClient = () => { if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.ARTWORK_TOKEN_SECRET || !process.env.PRODIGI_API_KEY) throw new Error('Payment and fulfillment settings are incomplete'); return new Stripe(process.env.STRIPE_SECRET_KEY); };
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const customization = cleanCustomization(body);
    const size = String(body.size || '').toLowerCase();
    const color = String(body.color || '').toLowerCase();
    const sizes = ['2xs','xs','s','m','l','xl','2xl','3xl','4xl','5xl'];
    const colors = ['black','natural','off white','white','burgundy','dark heather grey','french navy','aloe','butter','lavender','desert dust'];
    if (!customization.name || !customization.place || !sizes.includes(size) || !colors.includes(color)) return NextResponse.json({error:'Please check your design and shirt options.'},{status:400});
    const stripe = stripeClient();
    const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode:'payment', billing_address_collection:'auto', shipping_address_collection:{allowed_countries:['US','CA','GB','AU','NZ','IE','DE','FR','NL','ES','IT','SE','DK','NO','BE','AT','CH','PT']},
      phone_number_collection:{enabled:true}, allow_promotion_codes:true,
      line_items:[{quantity:1,price_data:{currency:'usd',unit_amount:4200,product_data:{name:`Your Little Night Garden tee · ${size.toUpperCase()} · ${color}`,description:`Organic cotton Stanley/Stella Creator 2.0. Custom specimen for ${customization.name}.`}}}],
      shipping_options:[{shipping_rate_data:{type:'fixed_amount',fixed_amount:{amount:595,currency:'usd'},display_name:'Tracked, made-to-order shipping',delivery_estimate:{minimum:{unit:'business_day',value:7},maximum:{unit:'business_day',value:14}}}}],
      metadata:{...customization,size,color,designVersion:'garden-v1'},
      success_url:`${base}/success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${base}/cancel`
    });
    return NextResponse.json({url:session.url});
  } catch (e:any) {
    const unavailable = e?.message === 'Payment and fulfillment settings are incomplete';
    return NextResponse.json({error: unavailable ? 'Checkout is being set up. The store owner needs to finish the payment and fulfillment settings.' : 'We could not start checkout. Please try again.'},{status:unavailable?503:500});
  }
}
