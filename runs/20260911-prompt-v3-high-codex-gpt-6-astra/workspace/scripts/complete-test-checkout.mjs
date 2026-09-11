// Test-only completion using Stripe CLI's official checkout fixture flow.
// Never included in the deployed app; no card numbers, only tok_visa.
import fs from 'node:fs';
import Stripe from 'stripe';
const raw=fs.readFileSync('.stripe-provision.log','utf8');const keys=JSON.parse(raw.slice(raw.indexOf('{'),raw.indexOf('}',raw.indexOf('{'))+1));
const stripe=new Stripe(keys.secret_key);const {sessionId}=JSON.parse(fs.readFileSync('.stripe-smoke.json','utf8'));
const page=await stripe.rawRequest('GET','/v1/payment_pages/'+sessionId);
const address={line1:'510 Townsend St',postal_code:'94103',city:'San Francisco',state:'CA',country:'US'};
const pm=await stripe.paymentMethods.create({type:'card',card:{token:'tok_visa'},billing_details:{name:'After Hours Test',email:'after-hours-test@example.com',phone:'+14155550100',address}});
try{const result=await stripe.rawRequest('POST','/v1/payment_pages/'+sessionId+'/confirm',{payment_method:pm.id,expected_amount:4800,shipping:{name:'After Hours Test',address},expected_payment_method_type:'card'});console.log('Confirmation:',JSON.stringify({status:result.status,payment_status:result.payment_status}));}catch(e){console.log('Confirmation error:',e.message)}
const session=await stripe.checkout.sessions.retrieve(sessionId);console.log(JSON.stringify({status:session.status,payment_status:session.payment_status,shipping:session.collected_information?.shipping_details,prodigiOrderId:session.metadata?.prodigiOrderId,fulfillment:session.metadata?.fulfillment,fulfillmentError:session.metadata?.fulfillmentError}));
