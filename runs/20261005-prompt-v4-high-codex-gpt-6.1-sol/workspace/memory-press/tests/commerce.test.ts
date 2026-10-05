import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertPaid, verifySignature, prodigiPayload, designSchema } from '../lib/commerce.ts';
import { defaults, artwork } from '../lib/art.ts';
const order={id:'order-1',session_id:'cs_test_1',amount:4400,design:JSON.stringify(defaults),asset_key:'a'.repeat(64),recipient:JSON.stringify({name:'Test',address:{countryCode:'US'}})};
const session={id:'cs_test_1',mode:'payment',status:'complete',payment_status:'paid',client_reference_id:'order-1',metadata:{order_id:'order-1'},amount_total:4400,currency:'usd',livemode:false,customer_details:{email:'test@example.com'},shipping_details:{name:'Test',address:{line1:'123 Test St',city:'Portland',postal_code:'97205',country:'US',state:'OR'}}};
test('only an independently verified paid session for the right order is fulfillable',()=>{
 assert.equal(assertPaid(session,order,false).address.countryCode,'US');
 for(const change of [{payment_status:'unpaid'},{payment_status:'no_payment_required'},{status:'open'},{amount_total:1},{currency:'eur'},{id:'other'},{metadata:{order_id:'other'}},{client_reference_id:'other'},{livemode:true},{mode:'subscription'},{shipping_details:null},{shipping_details:{...session.shipping_details,address:{...session.shipping_details.address,country:'CA'}}}])assert.throws(()=>assertPaid({...session,...change},order,false));
});
test('webhook signatures reject forgery, mutations, and stale timestamps',async()=>{
 const raw='{"test":true}', secret='test-signing-key',t=Math.floor(Date.now()/1000);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sig=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(t+'.'+raw))).toString('hex');
 assert.equal(await verifySignature(raw,`t=${t},v1=${sig}`,secret),true);
 assert.equal(await verifySignature(raw+' ',`t=${t},v1=${sig}`,secret),false);
 assert.equal(await verifySignature(raw,`t=${t},v1=${sig}`,'wrong'),false);
 assert.equal(await verifySignature(raw,`t=${t},v1=${sig}`,secret,Date.now()+400000),false);
 assert.equal(await verifySignature(raw,`t=${t},v1=garbage`,secret),false);
});
test('Prodigi payload preserves the verified recipient, immutable print, and idempotency key',()=>{
 const p=prodigiPayload(order,'https://example.com');assert.equal(p.idempotencyKey,order.id);assert.equal(p.items[0].sku,'GLOBAL-TEE-GIL-64000');assert.equal(p.items[0].assets[0].printArea,'front');assert.equal(p.items[0].assets[0].url,'https://example.com/api/assets/'+order.asset_key+'.png');assert.equal(p.items[0].sizing,'fitPrintArea');
});
test('customization rejects markup, invalid dates, unsupported variants, and overly long text',()=>{
 assert.deepEqual(designSchema.parse(defaults),defaults);
 for(const d of [{place:'<script>'},{date:'2026-02-31'},{size:'xs'},{color:'pink'},{dedication:'x'.repeat(41)}])assert.equal(designSchema.safeParse({...defaults,...d}).success,false);
});
test('unique print compositions are deterministic and safely escape personalized text',()=>{
 assert.equal(artwork(defaults),artwork(defaults));assert.notEqual(artwork(defaults),artwork({...defaults,place:'BIG SUR'}));assert.match(artwork({...defaults,dedication:'You & me'}),/You &amp; me/);
});
