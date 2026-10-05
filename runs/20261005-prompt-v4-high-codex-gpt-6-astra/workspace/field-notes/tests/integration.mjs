import {build} from 'esbuild';import {DatabaseSync} from 'node:sqlite';import {readFile,writeFile,mkdir} from 'node:fs/promises';import assert from 'node:assert/strict';import {createHmac} from 'node:crypto';
await mkdir('work/tests',{recursive:true});
const sqlite=new DatabaseSync(':memory:');sqlite.exec(await readFile('drizzle/0000_kind_thunderbolt_ross.sql','utf8'));
const files=new Map();
const DB={
 prepare(sql){
  return {bind(...args){
   return {
    async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:r.changes}};},
    async first(){return sqlite.prepare(sql).get(...args)||null;}
   };
  }};
 }
};
globalThis.testEnv={DB,BUCKET:{async put(key,value){files.set(key,value)}},STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture',PRODIGI_API_KEY:'fixture',STORE_MODE:'sandbox',SITE_URL:'https://test.example'};
await build({stdin:{contents:"export * from './lib/store';export * from './lib/payment';export * from './lib/design';export * from './lib/print';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:'work/tests/bundle.mjs',plugins:[{name:'env',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env=globalThis.testEnv'}))}}]});
const {checkout,fulfill,validSignature,assertPaid,initialDesign,designSchema,designSvg,printPdf}=await import('../work/tests/bundle.mjs');
let printCalls=0;let checkoutCalls=0;let lastPrint;const sessions=new Map();let failPrint=false;
globalThis.fetch=async(url,init={})=>{if(url.includes('/quotes'))return Response.json({quotes:[{costSummary:{totalCost:{amount:'22.75'}}}]});if(url.endsWith('/checkout/sessions')){checkoutCalls++;const f=new URLSearchParams(init.body);const id=`cs_test_${checkoutCalls}`;sessions.set(id,{id,metadata:{order_id:f.get('metadata[order_id]')},client_reference_id:f.get('client_reference_id'),payment_status:'unpaid',status:'open',livemode:false,currency:'usd',amount_subtotal:4400,amount_total:4400,shipping_details:{name:'Test Customer',address:{line1:'123 Test St',city:'Portland',postal_code:'97201',country:'US',state:'OR'}},customer_details:{email:'test@example.com'}});return Response.json({id,url:'https://checkout.stripe.com/test'});}if(url.includes('/checkout/sessions/'))return Response.json(sessions.get(url.split('/').at(-1)));if(url.endsWith('/orders')){printCalls++;lastPrint=JSON.parse(init.body);if(failPrint)return Response.json({error:'Temporary outage'},{status:503});return Response.json({outcome:'Created',order:{id:'ord_fixture'}});}throw new Error(`Unexpected call ${url}`)};
const request=()=>new Request('https://test.example/api/checkout',{method:'POST',headers:{origin:'https://test.example','Content-Type':'application/json'},body:JSON.stringify(initialDesign)});
assert.equal(designSchema.safeParse({...initialDesign,place:'<script>'}).success,false);assert.equal(designSchema.safeParse({...initialDesign,size:'5xl'}).success,false);assert.equal(designSchema.safeParse({...initialDesign,date:'2026-02-31'}).success,false);assert.equal(designSvg(initialDesign),designSvg(initialDesign));assert.notEqual(designSvg(initialDesign),designSvg({...initialDesign,edition:2}));
const secret=globalThis.testEnv.STRIPE_SECRET_KEY;delete globalThis.testEnv.STRIPE_SECRET_KEY;assert.equal((await checkout(request())).status,503);assert.equal(printCalls,0);globalThis.testEnv.STRIPE_SECRET_KEY=secret;
assert.equal((await checkout(request())).status,200);assert.equal(printCalls,0);assert.equal(files.size,1);const s=sessions.get('cs_test_1');await assert.rejects(()=>fulfill(s.id),/not complete/);assert.equal(printCalls,0);
s.status='complete';s.payment_status='paid';s.amount_subtotal=1;await assert.rejects(()=>fulfill(s.id),/amount mismatch/);assert.equal(printCalls,0);s.amount_subtotal=4400;s.livemode=true;await assert.rejects(()=>fulfill(s.id),/environment mismatch/);s.livemode=false;
s.client_reference_id='wrong';await assert.rejects(()=>fulfill(s.id),/order mismatch/);s.client_reference_id=s.metadata.order_id;
failPrint=true;await assert.rejects(()=>fulfill(s.id),/provider unavailable/);assert.equal(sqlite.prepare('SELECT status FROM orders WHERE id=?').get(s.metadata.order_id).status,'paid_retry_pending');const retryKey=lastPrint.idempotencyKey;failPrint=false;
await fulfill(s.id);assert.equal(lastPrint.idempotencyKey,retryKey);assert.equal(lastPrint.items[0].assets[0].printArea,'front');assert.equal(lastPrint.recipient.address.countryCode,'US');assert.equal(lastPrint.items[0].attributes.color,'natural');assert(lastPrint.items[0].assets[0].url.startsWith('https://test.example/api/assets/'));const calls=printCalls;await fulfill(s.id);assert.equal(printCalls,calls);
await checkout(request());const s2=sessions.get('cs_test_2');s2.status='complete';s2.payment_status='paid';const concurrent=await Promise.allSettled([fulfill(s2.id),fulfill(s2.id)]);assert.equal(printCalls,calls+1);assert.equal(concurrent.filter(x=>x.status==='fulfilled').length,1);
const payload=JSON.stringify({type:'checkout.session.completed'});const t=Math.floor(Date.now()/1000);const sig=createHmac('sha256','whsec_fixture').update(`${t}.${payload}`).digest('hex');assert(await validSignature(payload,`t=${t},v1=${sig}`,'whsec_fixture'));assert.equal(await validSignature(payload+'x',`t=${t},v1=${sig}`,'whsec_fixture'),false);assert.equal(await validSignature(payload,`t=${t},v1=${sig}`,'whsec_fixture',Date.now()+600000),false);
await writeFile('output/pdf/field-notes-print.pdf',await printPdf(initialDesign));
console.log('PASS: validation, deterministic design, missing credentials, checkout persistence, unpaid rejection, amount/environment/order matching, retry with stable idempotency, duplicate and concurrent fulfillment, signed/tampered/stale webhooks, and PDF generation.');
