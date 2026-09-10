import Stripe from 'stripe';
import {createHmac,timingSafeEqual,createHash} from 'node:crypto';
import {DesignSchema,PRICE,SHIPPING,SKU,type Design} from './design.js';
export const isLive=()=>process.env.PRODIGI_ENV==='live';
export const origin=()=>{const u=process.env.STORE_URL;if(!u)throw new Error('STORE_URL is missing');return u.replace(/\/$/,'');};
export function readiness(){const key=process.env.STRIPE_SECRET_KEY||'';return Boolean(/^sk_(test|live)_/.test(key)&&process.env.STRIPE_WEBHOOK_SECRET&&process.env.ART_SIGNING_SECRET&&process.env.PRODIGI_API_KEY&&process.env.STORE_URL&&(!isLive()||process.env.LIVE_FULFILLMENT_ENABLED==='true')&&(isLive()?key.startsWith('sk_live_'):key.startsWith('sk_test_')));}
export const stripe=()=>new Stripe(process.env.STRIPE_SECRET_KEY||'unconfigured');
export async function prodigi(path:string,body?:unknown){const r=await fetch(`https://api.${isLive()?'':'sandbox.'}prodigi.com/v4.0/${path}`,{method:body?'POST':'GET',headers:{'X-API-Key':process.env.PRODIGI_API_KEY||'','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(25000)});const data=await r.json();if(!r.ok)throw new Error(`Prodigi request failed (${r.status})`);return data;}
export function signature(p:string){if(!process.env.ART_SIGNING_SECRET)throw new Error('Artwork signing unavailable');return createHmac('sha256',process.env.ART_SIGNING_SECRET).update(p).digest('hex');}
export function validSignature(p:string,s:string){if(!/^[a-f0-9]{64}$/.test(s))return false;return timingSafeEqual(Buffer.from(s),Buffer.from(signature(p)));}
export function artUrl(d:Design){const p=Buffer.from(JSON.stringify(d)).toString('base64url');return `${origin()}/api/art?p=${p}&sig=${signature(p)}`;}
export const designHash=(d:Design)=>createHash('sha256').update(JSON.stringify(d)).digest('hex');
export async function quote(d:Design){const data=await prodigi('quotes',{shippingMethod:'Standard',destinationCountryCode:'US',currencyCode:'USD',items:[{sku:SKU,copies:1,attributes:{color:'white',size:d.size},assets:[{printArea:'front'}]}]});if(!['created','createdwithissues'].includes(data.outcome?.toLowerCase())||!data.quotes?.length||(data.issues||[]).some((issue:any)=>issue.errorCode!=='destinationCountryCode.UsSalesTaxWarning'))throw new Error('This shirt is temporarily unavailable. Please try again later.');return data;}
export function paidDesign(s:any){
 if(s.payment_status!=='paid')throw new Error('Payment has not succeeded');
 if(s.mode!=='payment'||s.currency!=='usd'||s.metadata?.store!=='personal-best-v1')throw new Error('Invalid store payment');
 const d=DesignSchema.parse(JSON.parse(s.metadata.design));
 if(s.metadata.design_hash!==designHash(d)||s.amount_subtotal!==PRICE||s.total_details?.amount_shipping!==SHIPPING||s.amount_total!==PRICE+SHIPPING+(s.total_details?.amount_tax||0)||s.total_details?.amount_discount)throw new Error('Payment amount or design mismatch');
 const expectedLive=isLive();if(s.livemode!==expectedLive)throw new Error('Payment environment mismatch');
 if(expectedLive&&process.env.LIVE_FULFILLMENT_ENABLED!=='true')throw new Error('Live fulfillment is disabled');
 return d;
}
export async function fulfill(sessionId:string,client:any=stripe(),send:typeof prodigi=prodigi){
 const s=await client.checkout.sessions.retrieve(sessionId);
 const d=paidDesign(s);
 if(s.metadata.prodigi_order_id)return {id:s.metadata.prodigi_order_id,status:s.metadata.fulfillment_status||'submitted'};
 // A confirmed payment is verified on Stripe on EVERY attempt. Prodigi's own
 // idempotency key protects both webhook retries and concurrent return-page calls.
 const shipping=s.collected_information?.shipping_details||s.shipping_details;
 const a=shipping?.address;
 if(!shipping?.name||!a?.line1||!a?.postal_code||!a?.city||a.country!=='US')throw new Error('Missing or unsupported shipping address');
 const result=await send('orders',{merchantReference:s.id,idempotencyKey:`personal-best-${s.id}`,shippingMethod:'Standard',recipient:{name:shipping.name,email:s.customer_details?.email,phoneNumber:s.customer_details?.phone,address:{line1:a.line1,line2:a.line2,postalOrZipCode:a.postal_code,countryCode:a.country,townOrCity:a.city,stateOrCounty:a.state}},items:[{merchantReference:designHash(d),sku:SKU,copies:1,sizing:'fitPrintArea',attributes:{color:'white',size:d.size},assets:[{printArea:'front',url:artUrl(d)}]}],metadata:{stripeSessionId:s.id,design:d,version:'1'}});
 if(!result.order?.id)throw new Error('Prodigi did not confirm an order');
 const issues=result.order.status?.issues||[];const status=issues.length?'needs_attention':'submitted';
 await client.checkout.sessions.update(s.id,{metadata:{prodigi_order_id:result.order.id,fulfillment_status:status}});
 return {id:result.order.id,status};
}
