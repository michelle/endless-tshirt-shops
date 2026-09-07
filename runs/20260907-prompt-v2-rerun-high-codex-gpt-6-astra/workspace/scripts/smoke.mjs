import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.argv[2]||process.env.NEXT_PUBLIC_SITE_URL;
if(!base?.startsWith('https://'))throw new Error('Pass the deployed https:// URL. This script creates one SANDBOX order.');
let count=0;const results=[];
function ok(label,detail){count++;results.push({check:label,result:'passed',...(detail?{detail}:{})});console.log(`PASS ${label}`,detail??'')}
async function request(path,body,token){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});const j=await r.json();return {status:r.status,data:j}}
const health=await request('/api/health');assert.equal(health.status,200);assert.equal(health.data.mode,'sandbox');assert.equal(health.data.configured,true);ok('Deployed health reports configured sandbox');
for(const [path,text]of [['/','Better'],['/products/long-way','Take the Long Way'],['/products/bird-club','Less Scrolling'],['/cart','Opening your bag'],['/checkout','Opening checkout'],['/help','The field guide'],['/orders','Your test orders']]){const r=await fetch(base+path);assert.equal(r.status,200);assert.ok((await r.text()).includes(text),path);ok(`Page ${path} responds with expected content`)}
for(const art of ['long-way','bird-club','blank-shirt']){const r=await fetch(`${base}/art/${art}.png`);assert.equal(r.status,200);assert.ok(r.headers.get('content-type').includes('image/png'));const bytes=new Uint8Array(await r.arrayBuffer());assert.equal(bytes[0],137);assert.equal(bytes[1],80);ok(`Public PNG ${art} accessible to print provider`,`${bytes.length} bytes`)}
assert.equal((await fetch(base+'/not-a-real-page')).status,404);ok('Missing pages return 404');
const recipient={name:'Alex Field',email:'alex@example.com',phoneNumber:'+1 202 555 0123',address:{line1:'123 Test Street',line2:'',townOrCity:'Springfield',stateOrCounty:'IL',postalOrZipCode:'62704',countryCode:'US'}};
const items=[{productId:'long-way',size:'M',quantity:1},{productId:'bird-club',size:'L',quantity:1}];
for(const bad of [{items:[],recipient},{items:[{...items[0],quantity:-1}],recipient},{items:[{...items[0],price:1}],recipient},{items:[{...items[0],size:'5XL'}],recipient},{items,recipient:{...recipient,address:{...recipient.address,countryCode:'CA'}}}])assert.equal((await request('/api/quotes',bad)).status,400);ok('API rejects empty bag, invalid quantity/size, price injection and unsupported destination');
const foreign=await fetch(base+'/api/quotes',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://foreign.example'},body:JSON.stringify({items,recipient})});assert.equal(foreign.status,403);ok('Foreign-origin submission rejected');
const quote=await request('/api/quotes',{items,recipient});assert.equal(quote.status,200,JSON.stringify(quote.data));assert.equal(quote.data.subtotal,6800);assert.ok(quote.data.options.length);ok('Actual Prodigi US shipping quote',quote.data.options);
const gb=await request('/api/quotes',{items:[items[0]],recipient:{...recipient,address:{...recipient.address,countryCode:'GB',townOrCity:'London',stateOrCounty:'',postalOrZipCode:'SW1A 1AA'}}});assert.equal(gb.status,200,JSON.stringify(gb.data));ok('Actual Prodigi UK shipping quote',gb.data.options);
const orderBody={quoteToken:quote.data.quoteToken,shippingMethod:quote.data.options[0].method,paymentOutcome:'decline',acceptSandbox:true};
const decline=await request('/api/orders',orderBody);assert.equal(decline.status,402);ok('Declined simulated payment does not submit an order');
const tamper=await request('/api/orders',{...orderBody,paymentOutcome:'approve',quoteToken:'malformed-token'});assert.equal(tamper.status,401);ok('Tampered shipping quote rejected');
orderBody.paymentOutcome='approve';const created=await request('/api/orders',orderBody);assert.equal(created.status,201,JSON.stringify(created.data));assert.ok(created.data.order.id);assert.equal(created.data.order.items.length,2);assert.equal(created.data.order.subtotal,6800);assert.equal(created.data.order.total,6800+quote.data.options[0].price);ok('Approved checkout creates a two-design Prodigi sandbox order',created.data.order.id);
const {id}=created.data.order;const token=created.data.token;
fs.writeFileSync('/tmp/offhours-integration-private.json',JSON.stringify({base,id,token}),{mode:0o600});
const repeat=await request('/api/orders',orderBody);assert.equal(repeat.status,201,JSON.stringify(repeat.data));assert.equal(repeat.data.order.id,id);ok('Duplicate submission returns the SAME Prodigi order ID');
const unauthorized=await request(`/api/orders/${id}`);assert.equal(unauthorized.status,401);const wrong=await request('/api/orders/ord_wrong',undefined,token);assert.equal(wrong.status,401);ok('Order status requires valid order-specific private token');
const order=await request(`/api/orders/${id}`,undefined,token);assert.equal(order.status,200);assert.ok(!JSON.stringify(order.data).includes(recipient.email));assert.ok(!JSON.stringify(order.data).includes(recipient.address.line1));ok('Authorized order status works without exposing address or email',order.data.order);
fs.writeFileSync('TEST-REPORT.json',JSON.stringify({base,created:new Date().toISOString(),passed:count,results,orderId:id},null,2));
console.log(`\n${count} checks passed. Private access token saved outside project. Order remains available for asset-processing verification.`);
