import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { parseDesign, priceCents } from '@/lib/design';
import { signArt } from '@/lib/art-signature';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.PRODIGI_API_KEY) return new NextResponse('Webhook not configured',{status:503});
  let event: Stripe.Event;
  try { event = stripe().webhooks.constructEvent(await request.text(),request.headers.get('stripe-signature') || '',process.env.STRIPE_WEBHOOK_SECRET); }
  catch { return new NextResponse('Invalid signature',{status:400}); }
  if (!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)) return NextResponse.json({received:true});
  try {
    const supplied = event.data.object as Stripe.Checkout.Session;
    const session = await stripe().checkout.sessions.retrieve(supplied.id);
    if (session.payment_status !== 'paid' || session.amount_total !== priceCents || session.currency !== 'usd') return NextResponse.json({received:true,fulfilled:false});
    if (process.env.PRODIGI_MODE === 'live' && !session.livemode) throw new Error('Test payment cannot create a live Prodigi order');
    if (!session.collected_information?.shipping_details?.address || !session.collected_information?.shipping_details.name || !session.metadata?.design) throw new Error('Missing order details');
    const design = parseDesign(JSON.parse(session.metadata.design));
    const address = session.collected_information?.shipping_details.address;
    if (address.country !== 'US' || !address.line1 || !address.city || !address.postal_code) throw new Error('Invalid shipping address');
    const base = process.env.NEXT_PUBLIC_SITE_URL;
    if (!base) throw new Error('Site URL not configured');
    const encoded = Buffer.from(JSON.stringify(design)).toString('base64url');
    const artwork = `${base}/api/art?d=${encoded}&format=png&sig=${signArt(encoded)}`;
    const response = await fetch(`${process.env.PRODIGI_MODE === 'live' ? 'https://api.prodigi.com' : 'https://api.sandbox.prodigi.com'}/v4.0/orders`,{
      method:'POST',headers:{'X-API-Key':process.env.PRODIGI_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({idempotencyKey:session.id,merchantReference:session.id,shippingMethod:'Budget',recipient:{name:session.collected_information?.shipping_details.name,email:session.customer_details?.email || undefined,phoneNumber:session.customer_details?.phone || undefined,address:{line1:address.line1,line2:address.line2 || undefined,townOrCity:address.city,stateOrCounty:address.state || undefined,postalOrZipCode:address.postal_code,countryCode:'US'}},items:[{sku:'GLOBAL-TEE-BC-3001',copies:1,sizing:'fitPrintArea',attributes:{color:design.color,size:design.size},recipientCost:{amount:(priceCents/100).toFixed(2),currency:'USD'},assets:[{printArea:'front',url:artwork}]}],metadata:{stripeSessionId:session.id}})
    });
    const result = await response.json();
    if (!response.ok || !['Created','AlreadyExists','OnHold'].includes(result.outcome) || result.order?.status?.issues?.length) { console.error('Prodigi order rejected',result); throw new Error('Prodigi order failed'); }
    console.log('Prodigi order',session.id,result.order?.id,result.outcome);
    return NextResponse.json({received:true,orderId:result.order?.id});
  } catch (e) { console.error('Fulfillment failed',e); return new NextResponse('Fulfillment failed',{status:500}); }
}
