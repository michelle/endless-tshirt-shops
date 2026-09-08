import Stripe from 'stripe';import fs from 'node:fs';
import {fulfillWith} from '../lib/fulfillment';
import {createHmac} from 'node:crypto';
const api=new Stripe(process.env.STRIPE_SECRET_KEY!);const {sessionId}=JSON.parse(fs.readFileSync('.private/test-order.json','utf8'));
fulfillWith(sessionId,{api,live:false,artUrl:d=>{const data=Buffer.from(JSON.stringify(d)).toString('base64url');const sig=createHmac('sha256',process.env.ART_SIGNING_SECRET!).update(data).digest('base64url');return `${process.env.SITE_URL}/api/art?data=${data}&sig=${sig}&v=1-outlines`;},submit:async(path,body)=>{const r=await fetch('https://api.sandbox.prodigi.com/v4.0'+path,{method:'POST',headers:{'X-API-Key':process.env.PRODIGI_API_KEY!,'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!data.order?.id)throw new Error(JSON.stringify(data));return data;}}).then(r=>console.log(r)).catch(e=>{console.error(e.message);process.exitCode=1;});
