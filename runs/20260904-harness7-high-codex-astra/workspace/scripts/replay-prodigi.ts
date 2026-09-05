import {stripe} from '../lib/config';
import {printRequest} from '../lib/fulfillment';
import {prodigi,ProdigiOrder} from '../lib/prodigi';
import fs from 'node:fs';
async function main(){const id=fs.readFileSync('artifacts/checkout-url.txt','utf8').match(/cs_test_[^#]+/)![0];const s=await stripe().checkout.sessions.retrieve(id);const result=await prodigi<{outcome:string;order?:ProdigiOrder}>('/orders',printRequest(s));console.log({outcome:result.outcome,id:result.order?.id,original:s.metadata?.prodigi_order_id});if(result.order?.id!==s.metadata?.prodigi_order_id)throw new Error('Provider idempotency did not return original order');}main();
