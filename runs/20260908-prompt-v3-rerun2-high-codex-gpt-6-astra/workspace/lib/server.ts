import 'server-only';
import {fulfillWith} from './fulfillment';
import Stripe from 'stripe';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { designSchema, type Design, PRICE, SHIPPING, SKU } from './design';
export function stripe(){if(!process.env.STRIPE_SECRET_KEY)throw new Error('Payments are not configured yet. Please try again later.');return new Stripe(process.env.STRIPE_SECRET_KEY);}
export function origin(){const value=process.env.SITE_URL;if(!value)throw new Error('SITE_URL is missing');return value.replace(/\/$/,'');}
function secret(){if(!process.env.ART_SIGNING_SECRET)throw new Error('Signing secret is missing');return process.env.ART_SIGNING_SECRET;}
export function sign(value:string){return createHmac('sha256',secret()).update(value).digest('base64url');}
export function verify(value:string,sig:string){const expected=sign(value);return sig.length===expected.length && timingSafeEqual(Buffer.from(expected),Buffer.from(sig));}
export function artUrl(d:Design){const data=Buffer.from(JSON.stringify(d)).toString('base64url');return `${origin()}/api/art?data=${data}&sig=${sign(data)}&v=1-outlines`;}
export async function prodigi(path:string,body?:unknown){
 if(!process.env.PRODIGI_API_KEY)throw new Error('Fulfillment is not configured');
 const base=process.env.PRODIGI_ENV==='live'?'https://api.prodigi.com/v4.0':'https://api.sandbox.prodigi.com/v4.0';
 const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'X-API-Key':process.env.PRODIGI_API_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(22000),cache:'no-store'});
 const data=await r.json();if(!r.ok||!['ok','created','alreadyexists','onhold','createdwithissues'].includes(String(data.outcome).toLowerCase()))throw new Error(`Prodigi request failed (${r.status}): ${JSON.stringify(data).slice(0,1500)}`);return data;
}
export async function checkVariant(d:Design){
 const data=await prodigi(`/products/${SKU}`);
 const variant=data.product.variants.find((v:any)=>v.attributes.color===d.color&&v.attributes.size===d.size&&v.shipsTo.includes('US'));
 if(!variant)throw new Error('That size is currently unavailable for US delivery.');
 return variant;
}
export async function fulfill(sessionId:string){return fulfillWith(sessionId,{api:stripe(),submit:prodigi,artUrl,live:process.env.PRODIGI_ENV==='live'});}
