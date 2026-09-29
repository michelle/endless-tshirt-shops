import Stripe from 'stripe';
import { cleanCustomization, sealCustomization } from '@/lib/artwork';
export const runtime = 'nodejs';
const sku = 'TEE-SS-STTU755';
export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return new Response('Payment webhook is not configured', {status:503});
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing Stripe signature',{status:400});
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(await req.text(),signature,process.env.STRIPE_WEBHOOK_SECRET); }
  catch { return new Response('Invalid Stripe signature',{status:400}); }
  if (event.type !== 'checkout.session.completed') return Response.json({received:true});
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== 'paid') return Response.json({received:true,skipped:'unpaid'});
  if (!process.env.PRODIGI_API_KEY || !process.env.ARTWORK_TOKEN_SECRET) return new Response('Fulfillment is not configured', {status:500});
  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address;
  const recipientName = shipping?.name || session.customer_details?.name;
  if (!address || !recipientName || !session.id) return new Response('Paid order is missing shipping details',{status:400});
  const custom = cleanCustomization(session.metadata || {});
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) return new Response('Artwork host is not configured',{status:500});
  const artwork = new URL('/api/artwork',site);
  artwork.searchParams.set('token',sealCustomization(custom));
  const order = {
    merchantReference:`night-garden-${session.id}`,
    idempotencyKey:session.id,
    shippingMethod:'Standard',
    recipient:{name:recipientName,email:session.customer_details?.email || '',phoneNumber:session.customer_details?.phone || '',address:{line1:address.line1 || '',line2:address.line2 || '',postalOrZipCode:address.postal_code || '',countryCode:address.country || '',townOrCity:address.city || '',stateOrCounty:address.state || ''}},
    items:[{sku,copies:1,sizing:'fitPrintArea',attributes:{size:customAnd(session,'size'),color:customAnd(session,'color'),brand:'Stanley / Stella',edge:'Crew neck',gender:'Unisex',paperType:'100% organic ringspun cotton',style:'Creator 2.0 STTU169'},assets:[{printArea:'front',url:artwork.toString()}]}]
  };
  const response = await fetch(`${process.env.PRODIGI_API_BASE || 'https://api.sandbox.prodigi.com'}/v4.0/orders`,{method:'POST',headers:{'X-API-Key':process.env.PRODIGI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(order)});
  const payload = await response.text();
  if (!response.ok) { console.error('Prodigi order rejected', response.status, payload.slice(0,1000)); return new Response('Fulfillment order could not be submitted',{status:502}); }
  console.info('Prodigi sandbox order accepted',session.id);
  return Response.json({received:true,fulfilled:true});
}
function customAnd(session:Stripe.Checkout.Session,key:string) { return session.metadata?.[key] || ''; }
