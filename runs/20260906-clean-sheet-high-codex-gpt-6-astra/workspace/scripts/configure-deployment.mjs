import Stripe from 'stripe';
import {appendFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const client=new Stripe(process.env.STRIPE_SECRET_KEY);
const webhook=await client.webhookEndpoints.create({url:process.env.STORE_URL+'/api/webhooks/stripe',enabled_events:['checkout.session.completed','checkout.session.async_payment_succeeded'],description:'Night Shift checkout fulfillment'});
await appendFile('.env.local','\nSTRIPE_WEBHOOK_SECRET='+webhook.secret+'\n');
await writeFile('.vercel/stripe-webhook.json',JSON.stringify({id:webhook.id,url:webhook.url}));
const env={STRIPE_SECRET_KEY:process.env.STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET:webhook.secret,PRODIGI_API_KEY:process.env.PRODIGI_API_KEY,STORE_URL:process.env.STORE_URL,STORE_MODE:'test'};
for(const [key,value] of Object.entries(env)){
 const r=spawnSync('vercel',['env','add',key,'production'],{input:value,encoding:'utf8'});
 if(r.status!==0)throw Error('Failed to configure '+key+': '+r.stderr);
 console.log('Configured',key);
}
console.log('Webhook endpoint created:',webhook.id);
