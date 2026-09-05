import Stripe from 'stripe';
import {createHash} from 'node:crypto';
import {stripe,appUrl,isSandbox} from './config';
import {catalog,Fit,PRICE,SHIPPING,SIZES} from './catalog';
import {prodigi,ProdigiOrder} from './prodigi';
export function validatePaidOrder(session:Stripe.Checkout.Session){
 const m=session.metadata||{};
 if(m.shop!=='datetime.store'||!(m.fit in catalog)||!SIZES.includes(m.size as typeof SIZES[number])||!/^\d{13}$/.test(m.timestamp||'')||m.sku!==catalog[m.fit as Fit]?.sku||m.artworkVersion!=='1')throw new Error('Invalid order metadata');
 if(session.payment_status!=='paid'||session.status!=='complete')throw new Error('Payment is not complete');
 if(session.currency!=='usd'||session.amount_subtotal!==PRICE||session.shipping_cost?.amount_total!==SHIPPING||session.amount_total!==PRICE+SHIPPING+(session.total_details?.amount_tax||0))throw new Error('Order total does not match catalog');
 if(session.livemode===isSandbox()||m.shopMode!==(isSandbox()?'sandbox':'live'))throw new Error('Order environment mismatch');
}
export function printRequest(session:Stripe.Checkout.Session){validatePaidOrder(session);const m=session.metadata!;const shipping=session.collected_information?.shipping_details;const address=shipping?.address;
 if(!shipping?.name||!address?.line1||!address.city||!address.postal_code||address.country!=='US')throw new Error('Valid US shipping information is required');
 return {idempotencyKey:createHash('sha256').update(`datetime-v1-${session.id}`).digest('hex'),merchantReference:session.id,shippingMethod:'Standard',recipient:{name:shipping.name,email:session.customer_details?.email||undefined,address:{line1:address.line1,line2:address.line2||undefined,townOrCity:address.city,stateOrCounty:address.state||undefined,postalOrZipCode:address.postal_code,countryCode:address.country}},items:[{merchantReference:`datetime-${m.timestamp}`,sku:catalog[m.fit as Fit].sku,copies:1,sizing:'fillPrintArea',attributes:{color:'black',size:m.size.toLowerCase()},assets:[{printArea:'front',url:`${appUrl()}/api/artwork/${m.timestamp}.png` }]}],metadata:{timestamp:m.timestamp,fit:m.fit,size:m.size,shopMode:m.shopMode,artworkVersion:'1'}};
}
export async function fulfillCheckout(sessionId:string){const client=stripe();const session=await client.checkout.sessions.retrieve(sessionId);validatePaidOrder(session);
 if(session.metadata?.prodigi_order_id)return {id:session.metadata.prodigi_order_id};
 try{const data=await prodigi<{order?:ProdigiOrder;outcome:string}>('/orders',printRequest(session));if(!data.order?.id)throw new Error('Printer did not return an order ID');
 await client.checkout.sessions.update(sessionId,{metadata:{prodigi_order_id:data.order.id,fulfillment_status:'submitted'}});console.info('fulfillment_submitted',{sessionId,orderId:data.order.id});return {id:data.order.id};
 }catch(e){console.error('fulfillment_failed',{sessionId,message:e instanceof Error?e.message:'unknown'});await client.checkout.sessions.update(sessionId,{metadata:{fulfillment_status:'retry_needed'}}).catch(()=>{});throw e}
}
