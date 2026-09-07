import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base=process.env.TEST_URL||'http://localhost:3001';
let passed=0;
async function post(path,body,expected=200,headers={}){
 const r=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 const d=await r.json();assert.equal(r.status,expected,`${path}: ${JSON.stringify(d)}`);passed++;return d;
}
const item={productId:'rain-check',size:'m',quantity:1};
for(const invalid of [[],[{...item,productId:'bogus'}],[{...item,size:'8xl'}],[{...item,quantity:-1}],[{...item,quantity:1.5}],[{...item,quantity:6}]])await post('quote',{items:invalid,country:'US'},400);
await post('quote',{items:[item],country:'XX'},400);
await post('quote',{items:[item],country:'US'},403,{Origin:'https://other-store.invalid'});
await post('order-status',{receipt:'forged.token'},403);
const q=await post('quote',{items:[{...item,price:1}],country:'US'});
assert.equal(q.subtotal,3200);assert.ok(q.shipping>0);assert.equal(q.total,3200+q.shipping);assert.equal(q.mode,'sandbox');passed++;
const order={checkoutId:randomUUID(),quoteToken:q.token,recipient:{name:'Alex Sandbox',email:'alex@example.com',address:'123 Test Street',apartment:'',city:'Portland',state:'OR',postalCode:'97205'},sandboxAcknowledged:true};
await post('orders',{...order,sandboxAcknowledged:false},400);
await post('orders',{...order,quoteToken:q.token.slice(0,-6)+'abcdef'},403);
await post('orders',{...order,recipient:{...order.recipient,email:'invalid'}},400);
await post('orders',{...order,recipient:{...order.recipient,postalCode:'bad'}},400);
const created=await post('orders',order,201);assert.ok(created.id.startsWith('ord_'));assert.ok(created.receipt);passed++;
const duplicate=await post('orders',order,201);assert.equal(created.id,duplicate.id);passed++;
const status=await post('order-status',{receipt:created.receipt});assert.equal(status.id,created.id);assert.equal(status.items[0].reference,'rain-check:m');assert.equal(status.items[0].color,'black');assert.ok(!('recipient' in status));passed++;
// The second artwork is also submitted to the provider and checked.
const cloudQuote=await post('quote',{items:[{productId:'cloud-watcher',size:'xl',quantity:1}],country:'GB'});
const cloud=await post('orders',{...order,checkoutId:randomUUID(),quoteToken:cloudQuote.token,recipient:{...order.recipient,address:'10 Test Road',city:'London',state:'',postalCode:'SW1A 1AA'}},201);
const cloudStatus=await post('order-status',{receipt:cloud.receipt});assert.equal(cloudStatus.items[0].color,'navy blue');assert.equal(cloudStatus.items[0].size,'xl');passed++;
for(const country of ['CA','AU']){const m=await post('quote',{items:['s','m','l','xl','2xl'].map(size=>({productId:'cloud-watcher',size,quantity:1})),country});assert.equal(m.subtotal,16000);assert.ok(m.shipping>0);passed++;}
for(const file of ['/','/art/rain.png','/art/clouds.png','/art/campaign.png']){const r=await fetch(base+file);assert.equal(r.status,200);if(file.endsWith('.png'))assert.match(r.headers.get('content-type'),/image\/png/);passed++;}
console.log(JSON.stringify({passed,base,rainOrder:created.id,cloudOrder:cloud.id,rainStage:status.stage,cloudStage:cloudStatus.stage,shippingCents:q.shipping}));
if(process.env.TEST_REPORT){const fs=await import('node:fs/promises');await fs.writeFile(process.env.TEST_REPORT,JSON.stringify({passed,base,created,cloud},null,2));}
