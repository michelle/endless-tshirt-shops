import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.TEST_BASE_URL||'https://benchmark-20260907-prompt-v2-high-c.vercel.app';
const report={base,checkedAt:new Date().toISOString(),checks:[]};
function checked(message){report.checks.push(message);console.log('PASS '+message)}
const post=async(path,body)=>{const res=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:res.status,data:await res.json()}};
for(const path of ['/','/product/long-way','/product/no-signal','/product/unavailable','/checkout','/info/shipping','/info/privacy','/info/sizing','/info/test-mode','/art/long-way.png','/art/no-signal.png','/art/unavailable.png','/art/shirt-base.png']){const r=await fetch(base+path);assert.equal(r.status,200,path);if(path.endsWith('.png'))assert.match(r.headers.get('content-type'),/image\/png/);checked(path+' responds publicly')}
const input={checkoutId:crypto.randomUUID(),cart:[{id:'long-way',size:'m',quantity:1},{id:'no-signal',size:'s',quantity:1},{id:'unavailable',size:'xl',quantity:1}],recipient:{name:'Sandbox Test',email:'test@example.com',address:{line1:'123 Test Street',line2:'',townOrCity:'San Francisco',stateOrCounty:'CA',postalOrZipCode:'94103',countryCode:'US'}}};
const invalid=await post('/api/quote',{...input,cart:[{id:'fake',size:'m',quantity:1}]});assert.equal(invalid.status,400);checked('Unknown catalog item rejected');
const quote=await post('/api/quote',input);assert.equal(quote.status,200,JSON.stringify(quote.data));assert.equal(quote.data.subtotal,10200);assert.ok(quote.data.shipping>0);assert.equal(quote.data.total,10200+quote.data.shipping);checked('Live sandbox shipping quote and authoritative price');
const orderInput={...input,quoteToken:quote.data.token,sandboxAcknowledged:true};
const altered=await post('/api/orders',{...orderInput,cart:[{id:'long-way',size:'m',quantity:10}]});assert.equal(altered.status,400);checked('Cart changes invalidate shipping authorization');
const forged=await post('/api/orders',{...orderInput,quoteToken:quote.data.token+'x'});assert.equal(forged.status,401);checked('Forged quote rejected');
const noAck=await post('/api/orders',{...orderInput,sandboxAcknowledged:false});assert.equal(noAck.status,400);checked('Sandbox acknowledgement required');
const order=await post('/api/orders',orderInput);assert.equal(order.status,200,JSON.stringify(order.data));assert.match(order.data.id,/^ord_/);checked('All three graphics submitted in genuine Prodigi sandbox order');report.orderId=order.data.id;
const duplicate=await post('/api/orders',orderInput);assert.equal(duplicate.status,200,JSON.stringify(duplicate.data));assert.equal(duplicate.data.id,order.data.id);checked('Retry returns same order; no duplicate fulfillment');
const unauthorized=await fetch(base+'/api/orders/'+order.data.id);assert.equal(unauthorized.status,401);checked('Order status protected by signed private receipt');
const status=await fetch(base+'/api/orders/'+order.data.id,{headers:{Authorization:'Bearer '+order.data.token}});assert.equal(status.status,200);const details=await status.json();assert.equal(details.id,order.data.id);assert.equal(details.items.length,3);assert.equal(details.totals.total,quote.data.total);assert.equal(details.recipient,undefined);checked('Live order status and receipt totals returned without shipping PII');report.orderStatus=details.status;report.totals=details.totals;
fs.writeFileSync('docs/smoke-results.json',JSON.stringify(report,null,2)+'\n');
console.log('Order ID: '+order.data.id+'; stage: '+details.status?.stage);
