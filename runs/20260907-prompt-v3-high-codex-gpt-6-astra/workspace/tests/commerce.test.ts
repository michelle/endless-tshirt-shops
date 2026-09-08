import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import sharp from 'sharp';
import {DEFAULT_DESIGN,designSchema,checkoutSchema,designSvg,STORE_ID} from '../lib/design';
import {decodeArt,encodeArt,idempotencyKey} from '../lib/security';
import {outlinedSvg,printPng} from '../lib/artwork';
import {fulfill,validatePayment} from '../lib/fulfillment';
import {getStripe} from '../lib/config';
import {POST as webhook} from '../app/api/webhooks/stripe/route';
process.env.ART_SIGNING_SECRET='test-only-signing-secret-with-at-least-32-characters';
process.env.APP_URL='https://orbit.example';process.env.PAYMENTS_MODE='test';process.env.PRODIGI_ENV='sandbox';
const paid=()=>({id:'cs_test_verified123',object:'checkout.session',status:'complete',payment_status:'paid',livemode:false,currency:'usd',amount_subtotal:3800,amount_total:4400,total_details:{amount_shipping:600,amount_tax:0,amount_discount:0},metadata:{store:STORE_ID,design:JSON.stringify(DEFAULT_DESIGN),size:'m',quantity:'1'},payment_intent:{id:'pi_test',status:'succeeded',currency:'usd',amount_received:4400,latest_charge:{refunded:false,amount_refunded:0,disputed:false}},collected_information:{shipping_details:{name:'Test Customer',address:{line1:'123 Test St',city:'San Francisco',state:'CA',postal_code:'94103',country:'US'}}},customer_details:{email:'test@example.com'}} as unknown as Stripe.Checkout.Session);
test('Reject impossible dates, overlong messages, unsupported glyphs and arbitrary sizes/quantities',()=>{
 for(const date of ['2025-02-29','2024-13-01','0000-01-01'])assert.equal(designSchema.safeParse({...DEFAULT_DESIGN,date}).success,false);
 assert.equal(designSchema.safeParse({...DEFAULT_DESIGN,date:'2024-02-29'}).success,true);
 assert.equal(designSchema.safeParse({...DEFAULT_DESIGN,dedication:'x'.repeat(33)}).success,false);
 assert.equal(designSchema.safeParse({...DEFAULT_DESIGN,place:'<script>'}).success,false);
 for(const quantity of [-1,0,1.5,6])assert.equal(checkoutSchema.safeParse({design:DEFAULT_DESIGN,size:'m',quantity,requestId:crypto.randomUUID()}).success,false);
 assert.equal(checkoutSchema.safeParse({design:DEFAULT_DESIGN,size:'invalid',quantity:1,requestId:crypto.randomUUID()}).success,false);
});
test('A changed personal detail changes the orbit; XML text is escaped',()=>{
 const base=designSvg(DEFAULT_DESIGN);
 for(const [key,value] of Object.entries({place:'SAN FRANCISCO',date:'2024-08-18',dedication:'OUR FIRST ADVENTURE',palette:'electric'}))assert.notEqual(designSvg({...DEFAULT_DESIGN,[key]:value}),base);
 assert.ok(designSvg({...DEFAULT_DESIGN,dedication:'YOU & ME'}).includes('YOU &amp; ME'));
});
test('Print link rejects forged and altered payloads',()=>{
 const token=encodeArt(DEFAULT_DESIGN);assert.deepEqual(decodeArt(token),DEFAULT_DESIGN);
 assert.throws(()=>decodeArt(token+'x'));
 assert.throws(()=>decodeArt(Buffer.from('{}').toString('base64url')+'.'+token.split('.')[1]));
});
test('Production artwork is transparent 4677×5881 PNG, 300 DPI, with outlined type',async()=>{
 const preview=outlinedSvg(DEFAULT_DESIGN),print=outlinedSvg(DEFAULT_DESIGN,true);assert.ok(!preview.includes('<text'));assert.ok(print.includes(preview.slice(preview.indexOf('<g'),preview.lastIndexOf('</svg>'))));
 const png=await printPng(DEFAULT_DESIGN);const info=await sharp(png).metadata();assert.equal(info.width,4677);assert.equal(info.height,5881);assert.equal(info.density,300);assert.equal(info.hasAlpha,true);
});
test('Only fully paid, matching, non-refunded payments may trigger printing',()=>{
 assert.equal(validatePayment(paid()).size,'m');
 for(const change of [{status:'open'},{payment_status:'unpaid'},{payment_status:'no_payment_required'},{amount_total:100},{amount_subtotal:100},{currency:'eur'},{livemode:true},{payment_intent:{status:'processing'}},{payment_intent:{...paid().payment_intent as object,amount_received:100}},{payment_intent:{...paid().payment_intent as object,latest_charge:{refunded:true,amount_refunded:4400}}},{payment_intent:{...paid().payment_intent as object,latest_charge:{disputed:true}}}])assert.throws(()=>validatePayment({...paid(),...change} as Stripe.Checkout.Session));
});
function harness(session:Stripe.Checkout.Session,failWrite=false){
 const stored=new Map<string,any>();let submits=0,creates=0,updates=0;
 const stripe={checkout:{sessions:{retrieve:async()=>structuredClone(session),update:async(_id:string,p:any)=>{updates++;if(failWrite&&updates===1)throw new Error('Simulated ledger outage after accepted print');Object.assign(session.metadata!,p.metadata);return session;}}}} as unknown as Stripe;
 const submit=async<T>(_path:string,p:any):Promise<T>=>{submits++;await new Promise(r=>setTimeout(r,5));if(!stored.has(p.idempotencyKey)){creates++;stored.set(p.idempotencyKey,{id:'ord_only_one',status:{stage:'InProgress'},payload:p});}return {outcome:submits===1?'Created':'AlreadyExists',order:stored.get(p.idempotencyKey)} as T;};
 const deps={stripe,submit,getOrder:async()=>stored.values().next().value};return {deps,stats:()=>({submits,creates,updates}),stored};
}
test('Unpaid and incomplete-address sessions create ZERO print orders',async()=>{
 for(const change of [{payment_status:'unpaid'},{collected_information:null}]){const h=harness({...paid(),...change} as Stripe.Checkout.Session);await assert.rejects(()=>fulfill('cs_test_verified123',h.deps));assert.equal(h.stats().submits,0);}
});
test('Concurrent payment webhook + return page create exactly one print order',async()=>{
 const h=harness(paid());const orders=await Promise.all([fulfill('cs_test_verified123',h.deps),fulfill('cs_test_verified123',h.deps),fulfill('cs_test_verified123',h.deps)]);assert.equal(h.stats().creates,1);assert.ok(orders.every(o=>o.id==='ord_only_one'));
 const p=h.stored.values().next().value.payload;assert.equal(p.items[0].sku,'GLOBAL-TEE-GIL-64000');assert.equal(p.items[0].copies,1);assert.equal(p.items[0].assets[0].printArea,'front');assert.equal(p.recipient.address.countryCode,'US');assert.match(p.items[0].assets[0].url,/https:\/\/orbit.example\/api\/art\?token=/);
});
test('Crash after printer accepts an order is safe to retry',async()=>{
 const h=harness(paid(),true);await assert.rejects(()=>fulfill('cs_test_verified123',h.deps));await fulfill('cs_test_verified123',h.deps);await fulfill('cs_test_verified123',h.deps);assert.equal(h.stats().creates,1);assert.equal(h.stats().submits,2);
 assert.equal(idempotencyKey('cs_test_verified123'),idempotencyKey('cs_test_verified123'));assert.notEqual(idempotencyKey('another'),idempotencyKey('cs_test_verified123'));
});
test('Webhook rejects unsigned/tampered requests and acknowledges valid irrelevant events',async()=>{
 process.env.STRIPE_SECRET_KEY='stripe_test_secret';process.env.STRIPE_WEBHOOK_SECRET='stripe_webhook_secret';
 const unsigned=await webhook(new Request('https://orbit.example/api/webhooks/stripe',{method:'POST',body:'{}'}));assert.equal(unsigned.status,400);
 const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);const payload=JSON.stringify({id:'evt_test',type:'checkout.session.expired',data:{object:{}}});const signature=stripe.webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_WEBHOOK_SECRET});
 assert.equal((await webhook(new Request('https://orbit.example/api/webhooks/stripe',{method:'POST',headers:{'stripe-signature':signature},body:payload}))).status,200);
 assert.equal((await webhook(new Request('https://orbit.example/api/webhooks/stripe',{method:'POST',headers:{'stripe-signature':signature},body:payload+' '}))).status,400);
 delete process.env.STRIPE_SECRET_KEY;delete process.env.STRIPE_WEBHOOK_SECRET;
});
test('Missing credentials and mismatched sandbox/live modes fail closed',()=>{
 delete process.env.STRIPE_SECRET_KEY;assert.throws(()=>getStripe());process.env.STRIPE_SECRET_KEY='stripe_test_secret';process.env.PRODIGI_ENV='live';assert.throws(()=>getStripe());process.env.PRODIGI_ENV='sandbox';process.env.PAYMENTS_MODE='live';assert.throws(()=>getStripe());process.env.PAYMENTS_MODE='test';delete process.env.STRIPE_SECRET_KEY;
});
test('Orbit geometry stays clear of customer title and date for every seed',()=>{
 for(const d of [DEFAULT_DESIGN,{...DEFAULT_DESIGN,place:'SAN FRANCISCO'},{...DEFAULT_DESIGN,dedication:'A WHOLE NEW CHAPTER'}]){
  const svg=designSvg(d);const ellipses=[...svg.matchAll(/<ellipse cx="300" cy="([\d.]+)" rx="([\d.]+)" ry="([\d.]+)"/g)];assert.equal(ellipses.length,48);
  for(const [,cy,rx,ry] of ellipses){const r=Math.max(+rx,+ry);assert.ok(+cy-r>120);assert.ok(+cy+r<501);}
 }
});
