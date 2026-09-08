import {AppError,getStripe,apiError} from '@/lib/config';
import {fulfill} from '@/lib/fulfillment';
import {STORE_ID} from '@/lib/design';
import type Stripe from 'stripe';
export const runtime='nodejs';
export async function POST(req:Request){
 const secret=process.env.STRIPE_WEBHOOK_SECRET;if(!secret)return Response.json({error:'Webhook not configured'},{status:503});
 let event:Stripe.Event;
 try{const body=await req.text();if(body.length>1048576)return new Response('Too large',{status:413});event=getStripe().webhooks.constructEvent(body,req.headers.get('stripe-signature')||'',secret);}catch{return Response.json({error:'Invalid webhook signature'},{status:400});}
 try{
  if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
   const session=event.data.object as Stripe.Checkout.Session;
   if(session.metadata?.store===STORE_ID&&session.payment_status==='paid')await fulfill(session.id);
  }
  return Response.json({received:true});
 }catch(e){
  // Deliberately reject transient fulfillment failures: Stripe retries delivery.
  // Invalid/refunded payments aren't safe to print on retries; record for review.
  if(e instanceof AppError&&e.status===409){console.error('Paid order requires review',{event:event.id,reason:e.message});return Response.json({received:true,review:true});}
  return apiError(e);
 }
}
