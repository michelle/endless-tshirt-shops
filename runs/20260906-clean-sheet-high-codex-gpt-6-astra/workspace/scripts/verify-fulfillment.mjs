import Stripe from 'stripe';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY),base=process.env.STORE_URL;
const report=JSON.parse(await readFile('verification.json','utf8'));
let session=await stripe.checkout.sessions.retrieve(report.checkoutSessionId);
for(let n=0;n<20&&!session.metadata.prodigiOrderId;n++){await new Promise(r=>setTimeout(r,2000));session=await stripe.checkout.sessions.retrieve(report.checkoutSessionId);}
assert.equal(session.payment_status,'paid');assert.ok(session.metadata.prodigiOrderId,'Webhook must create fulfillment');
const orderId=session.metadata.prodigiOrderId;
const res=await fetch('https://api.sandbox.prodigi.com/v4.0/orders/'+orderId,{headers:{'X-API-Key':process.env.PRODIGI_API_KEY}});const data=await res.json();assert.equal(res.status,200);assert.equal(data.order.merchantReference,session.id);assert.equal(data.order.items.length,2);assert.deepEqual(data.order.items.map(i=>i.copies),[1,2]);assert.equal(data.order.status.issues.length,0);
console.log('PASS automatic Stripe webhook submitted paid order to Prodigi:',orderId);
console.log('Print status:',JSON.stringify(data.order.status));console.log('Asset status:',JSON.stringify(data.order.items.map(i=>({design:i.merchantReference,assets:i.assets.map(a=>({area:a.printArea,status:a.status}))}))));
const payload=JSON.stringify({id:'evt_nightshift_replay',object:'event',type:'checkout.session.completed',data:{object:{id:session.id}}});
const signature=stripe.webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_WEBHOOK_SECRET});
const retry=await fetch(base+'/api/webhooks/stripe',{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':signature},body:payload});assert.equal(retry.status,200);assert.equal((await stripe.checkout.sessions.retrieve(session.id)).metadata.prodigiOrderId,orderId);console.log('PASS duplicate paid webhook preserved existing fulfillment');
const status=await (await fetch(base+'/api/orders?session_id='+session.id)).json();assert.equal(status.payment,'paid');assert.equal(status.orderId,orderId);assert.equal(status.issues,false);assert.equal(status.email,undefined);assert.equal(status.address,undefined);console.log('PASS customer status shows paid order without exposing address/email');
report.fulfillment={orderId,payment:'paid',stage:data.order.status.stage,issues:data.order.status.issues,assetStates:data.order.items.map(i=>i.assets.map(a=>a.status)),replayVerified:true,verifiedAt:new Date().toISOString()};report.checks.push('Actual test payment → automatic Stripe webhook → Prodigi sandbox fulfillment','Duplicate paid webhook handled without creating another order','Customer paid status and privacy verified');
await writeFile('verification.json',JSON.stringify(report,null,2));
