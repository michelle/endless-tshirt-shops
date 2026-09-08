import Stripe from 'stripe';import fs from 'node:fs';
const api=new Stripe(process.env.STRIPE_SECRET_KEY);const info=JSON.parse(fs.readFileSync('.private/test-order.json','utf8'));
const s=await api.checkout.sessions.retrieve(info.sessionId);
console.log('Webhook-only fulfillment before success page:',s.metadata.prodigiOrderId||'pending');
const r=await fetch(process.env.SITE_URL+'/api/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(info)});const order=await r.json();console.log('Deployed order status:',JSON.stringify(order));
fs.writeFileSync('.private/test-result.json',JSON.stringify(order),{mode:0o600});
if(!order.prodigiOrderId)process.exitCode=1;
else{const p=await fetch('https://api.sandbox.prodigi.com/v4.0/orders/'+order.prodigiOrderId,{headers:{'X-API-Key':process.env.PRODIGI_API_KEY}});const d=await p.json();console.log('Prodigi verification:',JSON.stringify({id:d.order.id,stage:d.order.status.stage,issues:d.order.status.issues,details:d.order.status.details,idempotencyKey:d.order.idempotencyKey,items:d.order.items.map(x=>({sku:x.sku,attributes:x.attributes,assets:x.assets.map(a=>({printArea:a.printArea,status:a.status}))}))}));}
