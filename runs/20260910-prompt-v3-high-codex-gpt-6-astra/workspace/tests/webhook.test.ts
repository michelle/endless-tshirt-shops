import {test} from 'node:test';import assert from 'node:assert/strict';import Stripe from 'stripe';import api from '../api/index.js';
test('webhook requires a real signature over raw bytes; a signed unpaid event does not trigger fulfillment',async()=>{
 process.env.STRIPE_WEBHOOK_SECRET='unit-test-webhook-secret';delete process.env.STRIPE_SECRET_KEY;
 const server=api.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 try{const a=server.address() as any;const url=`http://127.0.0.1:${a.port}/api/webhook`;const payload=JSON.stringify({id:'evt_unit_test',type:'checkout.session.completed',data:{object:{id:'cs_test_unit',metadata:{store:'personal-best-v1'},payment_status:'unpaid'}}});
 const bad=await fetch(url,{method:'POST',headers:{'content-type':'application/json','stripe-signature':'forged'},body:payload});assert.equal(bad.status,400);
 const client=new Stripe('unit-test-api-key');const sig=client.webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_WEBHOOK_SECRET});
 const valid=await fetch(url,{method:'POST',headers:{'content-type':'application/json','stripe-signature':sig},body:payload});assert.equal(valid.status,200);assert.deepEqual(await valid.json(),{received:true});
 const tampered=await fetch(url,{method:'POST',headers:{'content-type':'application/json','stripe-signature':sig},body:payload.replace('unpaid','paid')});assert.equal(tampered.status,400);
 }finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
});
