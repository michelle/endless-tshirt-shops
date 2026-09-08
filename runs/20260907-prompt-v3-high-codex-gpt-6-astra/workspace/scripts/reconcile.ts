/** Safe manual recovery: retrieve provider payment status before any printing. */
import nextEnv from '@next/env';
const {loadEnvConfig}=nextEnv;
loadEnvConfig(process.cwd());
const {getStripe}=await import('../lib/config');
const {fulfill}=await import('../lib/fulfillment');
const {STORE_ID}=await import('../lib/design');
const stripe=getStripe();let count=0,failures=0;
for await (const session of stripe.checkout.sessions.list({created:{gte:Math.floor(Date.now()/1000)-7*86400},limit:100})){
 if(session.metadata?.store!==STORE_ID||session.payment_status!=='paid'||session.metadata.prodigi_order_id)continue;
 try{await fulfill(session.id);count++;console.log('Recovered paid order',session.id);}catch{failures++;console.error('Review order in Stripe',session.id);}
}
console.log({recovered:count,needsReview:failures});if(failures)process.exitCode=1;
