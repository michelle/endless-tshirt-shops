import Stripe from 'stripe';import fs from 'node:fs';import assert from 'node:assert/strict';
const api=new Stripe(process.env.STRIPE_SECRET_KEY);const info=JSON.parse(fs.readFileSync('.private/test-order.json','utf8'));
const s=await api.checkout.sessions.retrieve(info.sessionId);assert.equal(s.livemode,false);const original=s.metadata.prodigiOrderId;assert.ok(original);
// Simulate a crash after the provider accepted the order but before metadata was saved.
await api.checkout.sessions.update(s.id,{metadata:{prodigiOrderId:''}});
const results=await Promise.all([1,2].map(async()=>{const r=await fetch(process.env.SITE_URL+'/api/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(info)});return r.json();}));
for(const r of results)assert.equal(r.prodigiOrderId,original);
console.log('Two concurrent retries recovered the same Prodigi order:',original);
fs.copyFileSync('.private/test-order.json','.private/paid-test-order.json');
