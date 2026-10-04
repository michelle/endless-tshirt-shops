import assert from 'node:assert/strict';
import { env } from './runtime';
import { fulfill,verifySignature } from '../lib/payments';
import { POST as webhook } from '../app/api/stripe/webhook/route';
import { POST as checkout } from '../app/api/checkout/route';
import { ready } from '../lib/store';
import {initialDesign,validateDesign} from '../lib/design';
let session:any={id:'cs_fixture',metadata:{order_id:'order-fixture'},payment_status:'unpaid',status:'open',amount_total:4800,currency:'usd',livemode:false,collected_information:{shipping_details:{name:'Test Customer',address:{line1:'123 Test Street',city:'Portland',state:'OR',postal_code:'97205',country:'US'}}},customer_details:{email:'test@example.com'}};
let submissions=0,attempts=0,fail=false,seen:any;
globalThis.fetch=async(url:any,init:any)=>{
 if(String(url).startsWith('https://api.stripe.com'))return Response.json(session);
 if(String(url).startsWith('https://api.sandbox.prodigi.com')){attempts++;seen=JSON.parse(init.body);assert.equal(seen.idempotencyKey,'order-fixture');assert.equal(seen.items[0].attributes.color,'navy blue');assert.equal(seen.items[0].assets[0].printArea,'front');if(fail)return Response.json({error:'temporary'},{status:503});submissions++;return Response.json({order:{id:'ord_fixture'}});}
 throw new Error('Unexpected external request '+url);
};
await env.DB.prepare('INSERT INTO orders (id,token,design,size,amount,currency,status,session_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind('order-fixture','token',JSON.stringify(initialDesign),'m',4800,'usd','pending','cs_fixture',Date.now(),Date.now()).run();
await assert.rejects(()=>fulfill('cs_fixture'));assert.equal(submissions,0);console.log('PASS: unpaid checkout cannot submit a shirt');
session.payment_status='paid';session.status='complete';session.amount_total=1;await assert.rejects(()=>fulfill('cs_fixture'));assert.equal(submissions,0);console.log('PASS: tampered payment total is rejected');
session.amount_total=4800;session.livemode=true;await assert.rejects(()=>fulfill('cs_fixture'));session.livemode=false;console.log('PASS: live/test mismatch is rejected');
fail=true;await assert.rejects(()=>fulfill('cs_fixture'));assert.equal((await env.DB.prepare('SELECT status FROM orders WHERE id=?').bind('order-fixture').first()).status,'fulfillment_error');fail=false;
await Promise.all([fulfill('cs_fixture'),fulfill('cs_fixture')]);assert.equal(submissions,1);await fulfill('cs_fixture');assert.equal(submissions,1);assert.equal(attempts,2);console.log('PASS: failed fulfillment retries, concurrent events and repeats produce one accepted order');
const raw=JSON.stringify({type:'checkout.session.completed',data:{object:session}}),t=Math.floor(Date.now()/1000);
const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(t+'.'+raw)));const sig=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
assert(await verifySignature(raw,`t=${t},v1=${sig}`,env.STRIPE_WEBHOOK_SECRET));assert(!await verifySignature(raw+'x',`t=${t},v1=${sig}`,env.STRIPE_WEBHOOK_SECRET));assert(!await verifySignature(raw,`t=${t},v1=${sig}`,env.STRIPE_WEBHOOK_SECRET,Date.now()+600000));
assert.equal((await webhook(new Request('https://example.test/api/stripe/webhook',{method:'POST',body:raw,headers:{'stripe-signature':`t=${t},v1=${sig}`}}))).status,200);
assert.equal((await webhook(new Request('https://example.test/api/stripe/webhook',{method:'POST',body:raw,headers:{'stripe-signature':'invalid'}}))).status,400);console.log('PASS: genuine signatures accepted; forged, altered and stale signatures rejected');
assert.equal((await checkout(new Request('https://example.test/api/checkout',{method:'POST',headers:{origin:'https://attacker.test'}}))).status,403);env.STRIPE_SECRET_KEY='';assert.equal(ready(),false);assert.equal((await checkout(new Request('https://example.test/api/checkout',{method:'POST',headers:{origin:'https://example.test'}}))).status,503);console.log('PASS: checkout rejects cross-origin requests and fails closed without payment credentials');
assert.throws(()=>validateDesign({...initialDesign,place:'<script>alert(1)</script>'}));console.log('PASS: invalid personalization rejected');
console.log('All payment safety checks passed. External Stripe and Prodigi responses were mocked; no payment was made.');
