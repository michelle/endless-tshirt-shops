import { z } from 'zod';
export const designSchema=z.object({
 place:z.string().trim().min(2).max(24).regex(/^[\p{L}\p{N} .,'’&-]+$/u,'Use letters, numbers, spaces, or simple punctuation'),
 date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s,'Choose a valid date'),
 dedication:z.string().trim().min(1).max(40).regex(/^[\p{L}\p{N} .,'’&!?-]+$/u),
 landscape:z.enum(['mountain','coast','desert']),palette:z.enum(['dusk','ocean','earth']),color:z.enum(['sand','black','white']),size:z.enum(['s','m','l','xl','2xl']),
});
export const PRICE=3800,SHIPPING=600,TOTAL=PRICE+SHIPPING,SKU='GLOBAL-TEE-GIL-64000';
export async function digest(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');}
export function secretToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function verifySignature(raw:string,signature:string,secret:string,now=Date.now()){
 const parts=signature.split(','); const t=parts.find(p=>p.startsWith('t='))?.slice(2); const values=parts.filter(p=>p.startsWith('v1=')).map(p=>p.slice(3));
 if(!t||!/^\d+$/.test(t)||Math.abs(now/1000-Number(t))>300) return false;
 const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 for(const v of values){if(!/^[0-9a-f]{64}$/i.test(v))continue;const bytes=new Uint8Array(v.match(/../g)!.map(b=>parseInt(b,16)));if(await crypto.subtle.verify('HMAC',k,bytes,new TextEncoder().encode(t+'.'+raw)))return true;}return false;
}
export function assertPaid(session:any,order:any,live:boolean){
 if(session.id!==order.session_id||session.metadata?.order_id!==order.id||session.client_reference_id!==order.id||session.mode!=='payment'||session.status!=='complete'||session.payment_status!=='paid'||session.amount_total!==order.amount||session.currency!=='usd'||session.livemode!==live)throw new Error('Payment has not been verified for this order');
 const s=session.collected_information?.shipping_details??session.shipping_details;
 const a=s?.address;
 if(!s?.name||!a?.line1||!a?.city||!a?.postal_code||a.country!=='US'||!a.state)throw new Error('A valid US shipping address is required');
 return {name:s.name,email:session.customer_details?.email??undefined,address:{line1:a.line1,line2:a.line2??'',postalOrZipCode:a.postal_code,countryCode:a.country,townOrCity:a.city,stateOrCounty:a.state}};
}
export function prodigiPayload(order:any,origin:string){const d=JSON.parse(order.design);return {
 idempotencyKey:order.id,merchantReference:`ELSEWHERE-${order.id}`,shippingMethod:'Standard',recipient:JSON.parse(order.recipient),
 items:[{merchantReference:order.id,sku:SKU,copies:1,sizing:'fitPrintArea',attributes:{color:d.color,size:d.size},recipientCost:{amount:'38.00',currency:'USD'},assets:[{printArea:'front',url:`${origin}/api/assets/${order.asset_key}.png`}]}],metadata:{store:'Elsewhere',orderId:order.id}
};}
