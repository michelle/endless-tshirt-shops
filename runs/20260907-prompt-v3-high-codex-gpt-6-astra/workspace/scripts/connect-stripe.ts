/** Connect only this run's Stripe test account and Vercel project. Never prints keys. */
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import Stripe from 'stripe';
import nextEnv from '@next/env';
const {loadEnvConfig}=nextEnv;
loadEnvConfig(process.cwd());
let key=process.env.STRIPE_SECRET_KEY;
if(!key&&process.env.BENCHMARK_STRIPE_CONFIG){
 const contents=fs.readFileSync(process.env.BENCHMARK_STRIPE_CONFIG,'utf8');
 key=contents.match(/test_mode_api_key\s*=\s*["']([^"']+)["']/)?.[1];
}
if(!key||! /^(sk|rk)_test_/.test(key))throw new Error('A Stripe test key is required. Run stripe login --config "$BENCHMARK_STRIPE_CONFIG", or securely set STRIPE_SECRET_KEY.');
const project=process.env.BENCHMARK_VERCEL_PROJECT||JSON.parse(fs.readFileSync('.vercel/project.json','utf8')).projectName;
const origin=process.env.STRIPE_SETUP_ORIGIN||`https://${project}.vercel.app`;
if(new URL(origin).protocol!=='https:')throw new Error('A deployed HTTPS origin is required.');
const stripe=new Stripe(key);
const url=origin+'/api/webhooks/stripe';
let secret=process.env.STRIPE_WEBHOOK_SECRET;
const endpoints=await stripe.webhookEndpoints.list({limit:100});
const exists=endpoints.data.find(e=>e.url===url&&e.status==='enabled');
if(exists&&!secret)throw new Error('This webhook already exists. Recover its signing secret from Stripe Workbench into STRIPE_WEBHOOK_SECRET, then rerun.');
if(!exists){
 const created=await stripe.webhookEndpoints.create({url,enabled_events:['checkout.session.completed','checkout.session.async_payment_succeeded'],description:`Personal Orbit — ${project}`});
 secret=created.secret;
}
if(!secret)throw new Error('No webhook secret returned.');
const file='.env.local';let contents=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
for(const [k,v] of Object.entries({STRIPE_SECRET_KEY:key,STRIPE_WEBHOOK_SECRET:secret})){
 contents=contents.split('\n').filter(line=>!line.startsWith(k+'=')).join('\n')+`\n${k}=${v}\n`;
}
fs.writeFileSync(file,contents,{mode:0o600});fs.chmodSync(file,0o600);
for(const [k,v] of Object.entries({STRIPE_SECRET_KEY:key,STRIPE_WEBHOOK_SECRET:secret})){
 const r=spawnSync('vercel',['env','add',k,'production','--force'],{input:v,encoding:'utf8'});
 if(r.status!==0)throw new Error(`Could not configure ${k} on Vercel. Credentials are saved in ignored .env.local for retry.`);
 console.log(`${k} configured on Vercel.`);
}
console.log('Stripe test checkout is connected. Run npm test, npm run build, then vercel --prod --yes to activate.');
