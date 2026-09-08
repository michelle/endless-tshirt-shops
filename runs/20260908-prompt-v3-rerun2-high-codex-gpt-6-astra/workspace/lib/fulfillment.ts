import {designSchema, type Design, SKU} from './design';
import {validPaidOrder} from './payment-guard';
export async function fulfillWith(sessionId:string,deps:{api:any;submit:(path:string,body?:unknown)=>Promise<any>;artUrl:(d:Design)=>string;live:boolean}){
 const api=deps.api,s=await api.checkout.sessions.retrieve(sessionId);
 if(!validPaidOrder(s,deps.live))return {paid:false,status:'Awaiting payment'};
 if(s.metadata?.prodigiOrderId)return {paid:true,status:'Order accepted',prodigiOrderId:s.metadata.prodigiOrderId};
 const pi=typeof s.payment_intent==='string'?await api.paymentIntents.retrieve(s.payment_intent,{expand:['latest_charge']}):s.payment_intent;
 const charge=pi?.latest_charge;
 if(charge && typeof charge!=='string' && (charge.refunded || charge.amount_refunded>0))throw new Error('Refunded orders cannot be fulfilled');
 const d=designSchema.parse(JSON.parse(s.metadata?.design||'{}'));
 const shipping=(s as any).collected_information?.shipping_details || (s as any).shipping_details;
 if(!shipping?.address||!shipping.name||shipping.address.country!=='US')throw new Error('Valid US shipping address required');
 const a=shipping.address;
 const result=await deps.submit('/orders',{idempotencyKey:`daymark:${s.id}`,merchantReference:s.id,shippingMethod:'Standard',recipient:{name:shipping.name,email:s.customer_details?.email,address:{line1:a.line1,line2:a.line2?.trim()||undefined,postalOrZipCode:a.postal_code,countryCode:a.country,townOrCity:a.city,stateOrCounty:a.state}},items:[{merchantReference:'daymark-tee',sku:SKU,copies:1,sizing:'fitPrintArea',attributes:{color:d.color,size:d.size},assets:[{printArea:'front',url:deps.artUrl(d)}]}],metadata:{stripeSession:s.id,store:'daymark-v1'}});
 const id=result.order?.id;if(!id)throw new Error('Prodigi did not return an order ID');
 await api.checkout.sessions.update(s.id,{metadata:{prodigiOrderId:id,fulfillmentState:'submitted'}});
 return {paid:true,status:'Order accepted',prodigiOrderId:id};
}
