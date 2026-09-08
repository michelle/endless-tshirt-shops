// Run with STRIPE_SECRET_KEY exported securely. Never pass credentials in command arguments.
import Stripe from 'stripe';
import {execFileSync} from 'node:child_process';
const key=process.env.STRIPE_SECRET_KEY;
const url=process.env.SITE_URL;
if(!key||!url||!url.startsWith('https://')||url.includes('undefined'))throw new Error('Set STRIPE_SECRET_KEY and SITE_URL first.');
if(!/^(sk|rk|rkcs)_test_/.test(key) && process.env.PRODIGI_ENV!=='live')throw new Error('Use a test key for sandbox.');
const api=new Stripe(key);
const endpoint=await api.webhookEndpoints.create({url:`${url}/api/webhooks/stripe`,enabled_events:['checkout.session.completed','checkout.session.async_payment_succeeded'],description:'Daymark payment-confirmed fulfillment'});
for(const [name,value] of Object.entries({STRIPE_SECRET_KEY:key,STRIPE_WEBHOOK_SECRET:endpoint.secret}))execFileSync('vercel',['env','add',name,'production','--force'],{input:value,stdio:['pipe','ignore','ignore']});
console.log('Stripe configured. Webhook endpoint:',endpoint.id);
console.log('Redeploy with vercel --prod --yes, then test a complete order.');
