import Stripe from 'stripe';
import {AppError,getOrigin,getStripe} from './config';
import {designSchema,SKU,STORE_ID,UNIT_PRICE,SHIPPING} from './design';
import {encodeArt,idempotencyKey} from './security';
import {prodigi,getPrintOrder,PrintOrder} from './prodigi';
export function readOrder(session:Stripe.Checkout.Session){
 if(session.metadata?.store!==STORE_ID)throw new AppError('Order not found.',404);
 const parsed=designSchema.safeParse(JSON.parse(session.metadata.design||'null'));
 const quantity=Number(session.metadata.quantity),size=session.metadata.size;
 if(!parsed.success||!Number.isInteger(quantity)||quantity<1||quantity>5||!['s','m','l','xl','2xl'].includes(size))throw new AppError('Invalid order details.',400);
 return {design:parsed.data,size,quantity};
}
export function validatePayment(session:Stripe.Checkout.Session){
 const order=readOrder(session);
 if(session.status!=='complete'||session.payment_status!=='paid')throw new AppError('Payment has not succeeded. Nothing has been sent to print.',409);
 const expectedLive=process.env.PAYMENTS_MODE==='live';
 if(session.livemode!==expectedLive)throw new AppError('Payment environment mismatch.',409);
 const pi=session.payment_intent as Stripe.PaymentIntent;
 if(!pi||typeof pi==='string'||pi.status!=='succeeded')throw new AppError('Payment is still being confirmed.',409);
 const total=UNIT_PRICE*order.quantity+SHIPPING+(session.total_details?.amount_tax||0);
 if(session.currency!=='usd'||session.amount_subtotal!==UNIT_PRICE*order.quantity||session.total_details?.amount_shipping!==SHIPPING||session.amount_total!==total||pi.amount_received!==total||pi.currency!=='usd')throw new AppError('Payment does not match this order.',409);
 const charge=pi.latest_charge as Stripe.Charge;
 if(charge&&(charge.refunded||charge.amount_refunded>0||charge.disputed))throw new AppError('This payment has been refunded or disputed; printing is paused.',409);
 return order;
}
export async function retrieveSession(id:string,stripe=getStripe()){
 if(!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)||id.length>250)throw new AppError('Invalid order reference.',400);
 return stripe.checkout.sessions.retrieve(id,{expand:['payment_intent.latest_charge']});
}
// Stripe is the durable order ledger. Prodigi's permanent account-scoped
// idempotency key is the atomic duplicate guard, including concurrent webhooks.
// If recording the ID in Stripe fails after submission, retrying returns the
// existing Prodigi order instead of manufacturing another shirt.
export async function fulfill(id:string,deps={stripe:getStripe(),submit:prodigi,getOrder:getPrintOrder}){
 const session=await retrieveSession(id,deps.stripe);
 if(session.metadata?.store!==STORE_ID)throw new AppError('Order not found.',404);
 if(session.metadata.prodigi_order_id)return deps.getOrder(session.metadata.prodigi_order_id);
 const order=validatePayment(session);
 const shipping=session.collected_information?.shipping_details;
 const address=shipping?.address;
 if(!shipping?.name||!address?.line1||!address.city||!address.postal_code||!address.state||address.country!=='US')throw new AppError('A complete US shipping address is required.',409);
 const result=await deps.submit<{outcome:string;order:PrintOrder}>('orders',{
  merchantReference:session.id,idempotencyKey:idempotencyKey(session.id),shippingMethod:'Standard',
  recipient:{name:shipping.name,email:session.customer_details?.email,address:{line1:address.line1,line2:address.line2||undefined,postalOrZipCode:address.postal_code,countryCode:address.country,townOrCity:address.city,stateOrCounty:address.state}},
  items:[{merchantReference:'personal-orbit-front-v1',sku:SKU,copies:order.quantity,sizing:'fitPrintArea',attributes:{color:'black',size:order.size},assets:[{printArea:'front',url:getOrigin()+'/api/art?token='+encodeArt(order.design)}]}],
  metadata:{stripeCheckoutSession:session.id,designVersion:'1'},
 });
 if(!result.order?.id)throw new AppError('Your payment is recorded. Printing confirmation is delayed; retrying will not charge you again.',502);
 const attention=result.outcome.toLowerCase()==='createdwithissues'||Boolean(result.order.status.issues?.length);
 await deps.stripe.checkout.sessions.update(session.id,{metadata:{prodigi_order_id:result.order.id,fulfillment_status:attention?'needs_attention':'submitted',fulfilled_at:new Date().toISOString()}});
 if(attention)console.error('Print order needs attention',{session:session.id,order:result.order.id});
 return result.order;
}
