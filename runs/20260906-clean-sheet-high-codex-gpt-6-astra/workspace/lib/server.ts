import Stripe from 'stripe';
import {paidOrder} from './fulfillment';
import {SKU,PRICE,artworkPath, type CartItem} from './catalog';
export function stripe(){if(!process.env.STRIPE_SECRET_KEY)throw Error('Missing Stripe configuration');return new Stripe(process.env.STRIPE_SECRET_KEY);}
export function storeUrl(){const url=process.env.STORE_URL;if(!url)throw Error('Missing store URL');return url.replace(/\/$/,'');}
export function requireTestMode(){if(process.env.STORE_MODE!=='test'||!process.env.STRIPE_SECRET_KEY?.includes('_test_'))throw Error('This release supports test payments and sandbox fulfillment only');}
export async function prodigi(path:string,body?:unknown){
 const r=await fetch('https://api.sandbox.prodigi.com/v4.0'+path,{method:body?'POST':'GET',headers:{'X-API-Key':process.env.PRODIGI_API_KEY||'','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(20000)});
 const d=await r.json();if(!r.ok)throw Error(`Prodigi request failed (${r.status}): ${d.outcome||'Unknown'}`);return d;
}
export function printItems(items:CartItem[],revision='v2'){return items.map(i=>({merchantReference:`${i.id}-${i.size}`,sku:SKU,copies:i.quantity,sizing:'fitPrintArea',attributes:{color:'black',size:i.size},recipientCost:{amount:(PRICE/100).toFixed(2),currency:'USD'},assets:[{printArea:'front',url:`${storeUrl()}${artworkPath(i.id,'png',revision)}`}]}));}
export async function fulfill(sessionId:string){
 requireTestMode();const client=stripe();const session=await client.checkout.sessions.retrieve(sessionId);
 if(session.metadata?.store!=='night-shift-v1')return {skipped:true};
 const order=paidOrder(session);
 if(session.metadata.prodigiOrderId)return {orderId:session.metadata.prodigiOrderId};
 const d=await prodigi('/orders',{merchantReference:order.merchantReference,idempotencyKey:order.idempotencyKey,shippingMethod:'Standard',recipient:order.recipient,items:printItems(order.items,session.metadata.artworkRevision||'v1'),metadata:{store:'night-shift-v1',stripeSessionId:session.id}});
 if(!d.order?.id)throw Error('Prodigi did not return an order ID');
 await client.checkout.sessions.update(session.id,{metadata:{prodigiOrderId:d.order.id,fulfillment:'submitted'}});
 return {orderId:d.order.id};
}
