import Stripe from 'stripe';
import {spawnSync} from 'node:child_process';
const key=process.env.STRIPE_SECRET_KEY;
const url=process.env.STORE_URL;
if(!key?.startsWith('sk_test_')||!url?.startsWith('https://')){console.error('Set STRIPE_SECRET_KEY to a Stripe sandbox secret key and STORE_URL to the deployed HTTPS origin.');process.exit(1)}
const stripe=new Stripe(key);
const endpointUrl=url.replace(/\/$/,'')+'/api/webhook';
// A new endpoint is intentional: Stripe only returns its signing secret at creation.
const endpoint=await stripe.webhookEndpoints.create({url:endpointUrl,enabled_events:['checkout.session.completed','checkout.session.async_payment_succeeded'],description:'Personal Best store payment-confirmed fulfillment'});
for(const [name,value] of [['STRIPE_SECRET_KEY',key],['STRIPE_WEBHOOK_SECRET',endpoint.secret]]){
 const p=spawnSync('vercel',['env','add',name,'production','--force'],{input:value,encoding:'utf8'});
 if(p.status!==0){console.error(`Could not save ${name}. Endpoint ${endpoint.id} was created; recover its secret in your secure session or recreate the endpoint.`,p.stderr);process.exit(1)}
 console.log(`${name} configured securely.`);
}
console.log(`Webhook registered: ${endpoint.id}. Redeploy with: vercel --prod --yes`);
