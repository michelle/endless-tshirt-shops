import { createHmac, timingSafeEqual } from 'node:crypto';
import { products, sizes, countries, type CartItem } from './catalog';
export class StoreError extends Error { constructor(message:string,public status=400){super(message);} }
export function cart(input:unknown):CartItem[] {
 if(!Array.isArray(input)||!input.length||input.length>10) throw new StoreError('Your bag must contain between 1 and 10 items.');
 const result = input.map((v:unknown)=>{
  if(!v||typeof v!=='object') throw new StoreError('Invalid item.');
  const a=v as CartItem;
  if(!products.some(p=>p.id===a.productId)||!sizes.includes(a.size as typeof sizes[number])||!Number.isInteger(a.quantity)||a.quantity<1||a.quantity>5) throw new StoreError('Please choose an available shirt, size, and quantity (1–5).');
  return {productId:a.productId,size:a.size,quantity:a.quantity};
 });
 if(result.reduce((s,i)=>s+i.quantity,0)>10) throw new StoreError('A maximum of 10 shirts can be ordered at once.');
 return result;
}
export function country(value:unknown):string {
 if(typeof value!=='string'||!countries.some(c=>c.code===value))throw new StoreError('Please choose a supported delivery country.');return value;
}
export const subtotal=(items:CartItem[])=>items.reduce((s,i)=>s+products.find(p=>p.id===i.productId)!.price*i.quantity,0);
function secret(){if(!process.env.ORDER_SIGNING_SECRET)throw new StoreError('Checkout is temporarily unavailable.',503);return process.env.ORDER_SIGNING_SECRET;}
export function digest(s:string){return createHmac('sha256',secret()).update(s).digest('base64url');}
export function sign(data:object){const body=Buffer.from(JSON.stringify(data)).toString('base64url');return `${body}.${digest(body)}`;}
export function verify(token:unknown):Record<string,any> {
 if(typeof token!=='string'||token.length>12000)throw new StoreError('Invalid checkout link.',403);
 const [body,sig,...rest]=token.split('.');const expected=digest(body||'');
 if(rest.length||!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw new StoreError('Invalid checkout link.',403);
 try{return JSON.parse(Buffer.from(body,'base64url').toString());}catch{throw new StoreError('Invalid checkout link.',403);}
}
export async function prodigi(path:string,body?:object){
 if(!process.env.PRODIGI_API_KEY)throw new StoreError('The print service is not configured.',503);
 // Intentionally pinned to sandbox. Payment verification must precede any live fulfillment.
 let response:Response;
 try{response=await fetch(`https://api.sandbox.prodigi.com/v4.0/${path}`,{method:body?'POST':'GET',headers:{'X-API-Key':process.env.PRODIGI_API_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(25000)});}catch{throw new StoreError('The print service took too long. Please retry; your checkout reference stays the same.',503);}
 const data=await response.json();
 if(!response.ok) { console.error('Prodigi request failed',response.status,data.outcome);throw new StoreError('The print service could not accept this request. Check your delivery details or try again shortly.',502); }
 return data;
}
export function quoteItems(items:CartItem[]){return items.map(i=>({sku:'GLOBAL-TEE-GIL-64000',copies:i.quantity,attributes:{color:products.find(p=>p.id===i.productId)!.color,size:i.size},assets:[{printArea:'front'}]}));}
export async function readBody(req:Request){
 const origin=req.headers.get('origin');
 if(origin&&origin!==new URL(req.url).origin&&origin!==process.env.SITE_URL)throw new StoreError('Please use checkout on this store.',403);
 const text=await req.text();if(text.length>18000)throw new StoreError('Request too large.',413);
 try{return JSON.parse(text);}catch{throw new StoreError('Invalid request.');}
}
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export function failure(error:unknown){if(error instanceof StoreError)return json({error:error.message},error.status);console.error('Store request failed');return json({error:'Something went wrong. Please try again.'},500);}
export function recipient(input:unknown,countryCode:string){
 if(!input||typeof input!=='object')throw new StoreError('Please enter your delivery details.');
 const a=input as Record<string,unknown>;
 function field(k:string,min=1,max=120){const v=a[k];if(typeof v!=='string'||v.trim().length<min||v.trim().length>max||/[\x00-\x1f]/.test(v))throw new StoreError(`Please check ${k.replace(/([A-Z])/g,' $1').toLowerCase()}.`);return v.trim();}
 const email=field('email',3,254);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new StoreError('Please enter a valid email address.');
 const postal=field('postalCode',2,16);if(countryCode==='US'&&!/^\d{5}(-\d{4})?$/.test(postal))throw new StoreError('Please enter a valid US ZIP code.');
 return {name:field('name',2),email,address:{line1:field('address',3),line2:field('apartment',0)||undefined,townOrCity:field('city',2),stateOrCounty:field('state',countryCode==='GB'?0:2)||undefined,postalOrZipCode:postal,countryCode}};
}
