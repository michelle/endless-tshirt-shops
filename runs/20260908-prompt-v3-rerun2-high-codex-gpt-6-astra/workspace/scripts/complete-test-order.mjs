// Stripe sandbox-only test helper, following Stripe CLI's official checkout fixture.
import Stripe from 'stripe';import fs from 'node:fs';
const key=process.env.STRIPE_SECRET_KEY;if(!key?.includes('_test_'))throw new Error('Test keys only');
const api=new Stripe(key);const {sessionId}=JSON.parse(fs.readFileSync('.private/test-order.json','utf8'));
const address={line1:'510 Townsend St',city:'San Francisco',state:'CA',postal_code:'94103',country:'US'};
async function pageRequest(suffix,params){const body=new URLSearchParams(params);const r=await fetch(`https://api.stripe.com/v1/payment_pages/${sessionId}${suffix}`,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Stripe-Version':'2025-08-27.basil','Content-Type':'application/x-www-form-urlencoded'},body});const d=await r.json();if(!r.ok){console.log('Payment page response',r.status,d.error?.code,d.error?.message);return null;}return d;}
const pm=await api.paymentMethods.create({type:'card',card:{token:process.env.TEST_DECLINE==='1'?'tok_chargeDeclined':'tok_visa'},billing_details:{email:'daymark-test@example.com',name:'Daymark Sandbox Test',address}});
const confirmed=await pageRequest('/confirm',{payment_method:pm.id,expected_amount:'4400',expected_payment_method_type:'card','shipping[name]':'Daymark Sandbox Test','shipping[address][line1]':address.line1,'shipping[address][city]':address.city,'shipping[address][state]':address.state,'shipping[address][postal_code]':address.postal_code,'shipping[address][country]':address.country});
if(!confirmed)process.exit(1);
console.log('Checkout confirmation:',confirmed.payment_status,confirmed.status);
const s=await api.checkout.sessions.retrieve(sessionId);console.log('Verified session:',s.id,s.payment_status,s.status,'shipping:',s.collected_information?.shipping_details);
