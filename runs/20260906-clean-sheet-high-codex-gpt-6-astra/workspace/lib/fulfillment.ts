import type Stripe from 'stripe';
import {createHash} from 'node:crypto';
import {cartSchema,total} from './catalog';
export function paidOrder(session:Stripe.Checkout.Session){
 if(session.metadata?.store!=='night-shift-v1')throw Error('Not a Night Shift order');
 if(session.livemode||session.payment_status!=='paid'||session.status!=='complete')throw Error('Payment is not complete');
 const items=cartSchema.parse(JSON.parse(session.metadata.cart||'[]'));
 if(session.amount_total!==total(items)||session.currency!=='usd')throw Error('Order total does not match');
 const shipping=session.collected_information?.shipping_details || (session as unknown as {shipping_details?:Stripe.Checkout.Session.CollectedInformation.ShippingDetails}).shipping_details;
 const a=shipping?.address;
 if(!shipping?.name||!a?.line1||!a.city||!a.postal_code||a.country!=='US')throw Error('Missing supported delivery address');
 return {items,merchantReference:session.id,idempotencyKey:createHash('sha256').update('night-shift:'+session.id).digest('hex'),recipient:{name:shipping.name,email:session.customer_details?.email,address:{line1:a.line1,line2:a.line2||undefined,postalOrZipCode:a.postal_code,townOrCity:a.city,stateOrCounty:a.state||undefined,countryCode:a.country}}};
}
