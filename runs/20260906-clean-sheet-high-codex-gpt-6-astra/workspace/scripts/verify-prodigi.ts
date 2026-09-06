import {prodigi,printItems} from '../lib/server';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
async function main(){
const key=createHash('sha256').update('nightshift-integration-'+process.env.STORE_URL).digest('hex');
const body={merchantReference:'nightshift-integration-test',idempotencyKey:key,shippingMethod:'Standard',recipient:{name:'Night Shift Test',email:'test@example.com',address:{line1:'123 Test Street',postalOrZipCode:'10001',countryCode:'US',townOrCity:'New York',stateOrCounty:'NY'}},items:printItems([{id:'orbit',size:'m',quantity:1}]),metadata:{test:'integration-verification',storeUrl:process.env.STORE_URL}};
const first=await prodigi('/orders',body);assert.ok(first.order?.id,JSON.stringify(first));console.log('PASS real Prodigi sandbox order created:',first.order.id,first.outcome);
const second=await prodigi('/orders',body);assert.equal(second.order?.id,first.order.id,JSON.stringify(second));console.log('PASS idempotent retry returned same order:',second.outcome);
await writeFile('prodigi-verification.json',JSON.stringify({orderId:first.order.id,firstOutcome:first.outcome,retryOutcome:second.outcome,status:first.order.status,createdAt:new Date().toISOString()},null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
