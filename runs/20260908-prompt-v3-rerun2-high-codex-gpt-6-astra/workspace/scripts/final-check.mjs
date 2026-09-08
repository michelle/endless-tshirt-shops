import Stripe from 'stripe';import fs from 'node:fs';import assert from 'node:assert/strict';
const api=new Stripe(process.env.STRIPE_SECRET_KEY);const info=JSON.parse(fs.readFileSync('.private/test-order.json','utf8'));let s=await api.checkout.sessions.retrieve(info.sessionId);assert.equal(s.payment_status,'unpaid');assert.ok(!s.metadata.prodigiOrderId);
if(s.status!=='expired')await api.checkout.sessions.expire(s.id);const r=await fetch(process.env.SITE_URL+'/api/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(info)});const order=await r.json();assert.equal(order.paid,false);assert.ok(!order.prodigiOrderId);console.log('Declined and expired checkout did not produce a print order.');
console.log('Health:',await(await fetch(process.env.SITE_URL+'/api/health')).json());
fs.copyFileSync('.private/test-order.json','.private/declined-test-order.json');fs.copyFileSync('.private/paid-test-order.json','.private/test-order.json');
