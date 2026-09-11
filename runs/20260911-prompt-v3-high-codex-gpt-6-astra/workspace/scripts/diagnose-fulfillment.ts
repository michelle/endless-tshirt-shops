import fs from 'node:fs';
import {fulfill,stripe,paidOrder,shipping} from '../lib/server';
const {sessionId}=JSON.parse(fs.readFileSync('.stripe-smoke.json','utf8'));
const originalFetch=globalThis.fetch;globalThis.fetch=async(...args)=>{const response=await originalFetch(...args);if(!response.ok && String(args[0]).includes('prodigi'))console.log('Prodigi validation:',JSON.stringify(await response.clone().json()));return response};
try{const s=await stripe().checkout.sessions.retrieve(sessionId,{expand:['payment_intent']});paidOrder(s);console.log('Paid order and shipping verified',shipping(s).address.countryCode);const result=await fulfill(sessionId);console.log('Fulfillment:',JSON.stringify(result))}catch(e){console.log('Fulfillment error:',(e as Error).message)}
