// Sandbox-only API integration test. Uses the same payment-page fixture flow as
// stripe/stripe-cli/pkg/fixtures/triggers/checkout.session.completed.json.
// Run: node --env-file=.env.local scripts/integration-test.mjs
import Stripe from 'stripe';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const base=process.env.APP_URL;
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
if(process.env.COMMERCE_MODE !== 'test' || !process.env.STRIPE_SECRET_KEY.includes('_test_')) throw new Error('Sandbox keys required');
async function request(path,body) { const r=await fetch(base+path,body ? {method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(body)} : {});return {status:r.status,data:await r.json()}; }
try {
  const capture=await request('/api/moment',{style:'unisex',size:'M'});assert.equal(capture.status,200);
  const payload={token:capture.data.token,requestId:crypto.randomUUID()};
  const checkout=await request('/api/checkout',payload);assert.equal(checkout.status,200,JSON.stringify(checkout.data));
  const repeat=await request('/api/checkout',payload);assert.equal(repeat.data.url,checkout.data.url);
  const id=new URL(checkout.data.url).pathname.split('/').pop();
  const original=await stripe.checkout.sessions.retrieve(id);
  assert.equal(original.amount_total,2250);assert.equal(original.shipping_address_collection.allowed_countries[0],'US');assert.equal(original.metadata.timestamp,String(capture.data.timestamp));
  const lineItems=await stripe.checkout.sessions.listLineItems(id);
  const shipping={name:'Datetime Sandbox Test',address:{line1:'510 Townsend St',city:'San Francisco',state:'CA',postal_code:'94103',country:'US'}};
  // Stripe CLI's fixture API does not fill hosted Checkout's address UI.
  // Seed the same test session configuration with shipping on PaymentIntent.
  const fixture=await stripe.checkout.sessions.create({
    mode:'payment',payment_method_types:['card'],
    line_items:[{price:lineItems.data[0].price.id,quantity:1}],
    success_url:base+'/success?session_id={CHECKOUT_SESSION_ID}',cancel_url:base+'/?checkout=canceled',
    metadata:original.metadata, payment_intent_data:{shipping},
    customer_email:'datetime-test@example.com',
  });
  await stripe.checkout.sessions.expire(id);
  await stripe.rawRequest('GET',`/v1/payment_pages/${fixture.id}`);
  const pm=await stripe.paymentMethods.create({type:'card',card:{token:'tok_visa'},billing_details:{name:shipping.name,address:shipping.address,email:'datetime-test@example.com'}});
  await stripe.rawRequest('POST',`/v1/payment_pages/${fixture.id}/confirm`,{payment_method:pm.id,expected_amount:2250});
  const paid=await stripe.checkout.sessions.retrieve(fixture.id);assert.equal(paid.payment_status,'paid');
  const events=await stripe.events.list({type:'checkout.session.completed',limit:20});
  const event=events.data.find(e=>e.data.object.id===fixture.id);
  fs.writeFileSync('/tmp/datetime-integration-result.json',JSON.stringify({sessionId:fixture.id,eventId:event?.id,timestamp:capture.data.timestamp,artworkToken:capture.data.token}),{mode:0o600});
  console.log(JSON.stringify({checkoutCreated:true,idempotentCheckout:true,serverPrice:2250,paidSession:fixture.id,event:event?.id||'pending'}));
} catch(error) { console.error({message:error.message,type:error.type,code:error.code});process.exitCode=1; }
