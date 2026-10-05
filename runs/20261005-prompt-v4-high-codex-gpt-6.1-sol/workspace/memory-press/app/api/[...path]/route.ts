import { env } from 'cloudflare:workers';
import { designSchema,TOTAL,PRICE,SHIPPING,digest,secretToken,verifySignature,assertPaid,prodigiPayload } from '@/lib/commerce';
export const dynamic='force-dynamic';
const json=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function demo(){return env.DEMO_MODE==='true'&&env.PRODIGI_ENV==='sandbox'&&!env.STRIPE_SECRET_KEY;}
function ready(){return Boolean(env.STRIPE_SECRET_KEY&&env.STRIPE_WEBHOOK_SECRET&&env.PRODIGI_API_KEY&&((env.PRODIGI_ENV==='sandbox'&&env.STRIPE_SECRET_KEY.startsWith('sk_test_'))||(env.PRODIGI_ENV==='live'&&env.STRIPE_SECRET_KEY.startsWith('sk_live_'))));}
async function stripe(path:string,body?:URLSearchParams,idempotency?:string){
 const r=await fetch('https://api.stripe.com/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY,'Stripe-Version':'2025-02-24.acacia',...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotency?{'Idempotency-Key':idempotency}:{})},body,signal:AbortSignal.timeout(20000)});
 const d:any=await r.json();if(!r.ok)throw new Error('Payment service is unavailable. Please try again.');return d;
}
async function orderFor(req:Request,id:string){
 const o:any=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(id).first();
 const token=req.headers.get('X-Order-Token');if(!o||!token||await digest(token)!==o.token_hash)return null;return o;
}
async function rateLimit(req:Request){
 const now=Date.now(),ip=req.headers.get('cf-connecting-ip')??'local';const key=await digest(ip+':'+Math.floor(now/3600000));
 const r:any=await env.DB.prepare('INSERT INTO rate_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now+7200000).first();
 if(r.count>20)throw new Error('Please wait before creating another order.');
 if(Math.random()<.02)await env.DB.prepare('DELETE FROM rate_limits WHERE expires<?').bind(now).run();
}
async function fulfill(id:string){
 let o:any=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(id).first();if(!o||o.mode==='demo'||!o.session_id)return;
 if(o.prodigi_id)return;
 if(!ready())throw new Error('Checkout configuration is incomplete');
 const session=await stripe('checkout/sessions/'+encodeURIComponent(o.session_id));
 const recipient=assertPaid(session,o,env.PRODIGI_ENV==='live');
 const now=Date.now();
 const claim=await env.DB.prepare("UPDATE orders SET state='submitting',recipient=?,updated=? WHERE id=? AND prodigi_id IS NULL AND (state IN ('pending','paid','fulfillment_failed') OR (state='submitting' AND updated<?))").bind(JSON.stringify(recipient),now,id,now-90000).run();
 if(!claim.meta.changes)throw new Error('Print submission is in progress; retry after the current attempt');
 o={...o,recipient:JSON.stringify(recipient)};
 try{
  const base=env.PRODIGI_ENV==='live'?'https://api.prodigi.com':'https://api.sandbox.prodigi.com';
  const r=await fetch(base+'/v4.0/orders',{method:'POST',headers:{'Content-Type':'application/json','X-API-Key':env.PRODIGI_API_KEY},body:JSON.stringify(prodigiPayload(o,env.SITE_URL)),signal:AbortSignal.timeout(25000)});
  const d:any=await r.json();if(!r.ok||!d.order?.id)throw new Error('Print partner did not accept the order');
  const hasIssues=d.outcome==='CreatedWithIssues'||Boolean(d.order.status?.issues?.length);
  await env.DB.prepare('UPDATE orders SET state=?,prodigi_id=?,error=?,updated=? WHERE id=?').bind(hasIssues?'needs_attention':'submitted',d.order.id,hasIssues?'Print partner flagged an issue; the store owner must review this order.':null,Date.now(),id).run();
 }catch(e){await env.DB.prepare("UPDATE orders SET state='fulfillment_failed',error=?,updated=? WHERE id=?").bind('Payment received. Print submission will be retried; please keep your order link.',Date.now(),id).run();throw e;}
}
export async function GET(req:Request){
 const path=new URL(req.url).pathname.replace('/api/','');
 try{
 if(path==='admin/orders'){
  if(!env.OWNER_EMAIL||!req.headers.get('oai-authenticated-user-id')||req.headers.get('oai-authenticated-user-email')!==env.OWNER_EMAIL)return json({error:'Owner access required'},403);
  const r=await env.DB.prepare('SELECT id,design,state,mode,amount,created,prodigi_id,error FROM orders ORDER BY created DESC LIMIT 200').all();
  return json({orders:r.results});
 }
 if(path==='config')return json({demo:demo(),checkoutReady:ready(),sandbox:env.PRODIGI_ENV!=='live',price:PRICE,shipping:SHIPPING,total:TOTAL});
 if(path.startsWith('assets/')){const key=path.slice(7).replace(/\.png$/,'');if(!/^[a-f0-9]{64}$/.test(key))return json({error:'Not found'},404);const f=await env.BUCKET.get('prints/'+key+'.png');if(!f)return json({error:'Not found'},404);return new Response(f.body,{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});}
 if(/^orders\/[0-9a-f-]{36}$/.test(path)){
  const o=await orderFor(req,path.split('/')[1]);if(!o)return json({error:'Order not found'},404);
  let tracking:any[]=[];let printStage='';
  if(o.prodigi_id){try{const base=env.PRODIGI_ENV==='live'?'https://api.prodigi.com':'https://api.sandbox.prodigi.com';const r=await fetch(base+'/v4.0/orders/'+o.prodigi_id,{headers:{'X-API-Key':env.PRODIGI_API_KEY},signal:AbortSignal.timeout(8000)});if(r.ok){const p:any=await r.json();printStage=p.order?.status?.stage??'';tracking=(p.order?.shipments??[]).flatMap((s:any)=>s.tracking?.url&&/^https:\/\//.test(s.tracking.url)?[{url:s.tracking.url,number:s.tracking.number}]:[]);}}catch{}}
  return json({id:o.id,design:JSON.parse(o.design),state:o.state,mode:o.mode,amount:o.amount,prodigiId:o.prodigi_id,error:o.error,printStage,tracking});
 }
 return json({error:'Not found'},404);
 }catch{return json({error:'The store is temporarily unavailable. Please try again.'},503);}
}
export async function POST(req:Request){
 const path=new URL(req.url).pathname.replace('/api/','');
 if(path==='webhooks/stripe'){
  if(!env.STRIPE_WEBHOOK_SECRET)return json({error:'Webhook is not configured'},503);
  const raw=await req.text();if(!await verifySignature(raw,req.headers.get('stripe-signature')??'',env.STRIPE_WEBHOOK_SECRET))return json({error:'Invalid signature'},400);
  try{const event=JSON.parse(raw);if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
   const s=event.data.object;if(s.payment_status==='paid'&&s.metadata?.order_id)await fulfill(s.metadata.order_id);
  }return json({received:true});}catch{return json({error:'Fulfillment pending; retry this event'},500);}
 }
 const origin=req.headers.get('origin');if(origin!==env.SITE_URL&&origin!==new URL(req.url).origin)return json({error:'Invalid request origin'},403);
 try{
  if(/^admin\/retry\/[0-9a-f-]{36}$/.test(path)){
   if(!env.OWNER_EMAIL||!req.headers.get('oai-authenticated-user-id')||req.headers.get('oai-authenticated-user-email')!==env.OWNER_EMAIL)return json({error:'Owner access required'},403);
   await fulfill(path.split('/')[2]);return json({ok:true});
  }
  if(path==='checkout'){
   if(!demo()&&!ready())return json({error:'Checkout is awaiting the store owner’s Stripe configuration.'},503);
   await rateLimit(req);
   const form=await req.formData();const d=designSchema.parse(JSON.parse(String(form.get('design'))));const image=form.get('print');
   if(!(image instanceof File)||image.type!=='image/png'||image.size<1000||image.size>5000000)return json({error:'Invalid print file'},400);
   const bytes=await image.arrayBuffer();const a=new Uint8Array(bytes),v=new DataView(bytes);
   if(a.slice(0,8).join(',')!=='137,80,78,71,13,10,26,10'||v.getUint32(16)!==4677||v.getUint32(20)!==5881)return json({error:'The print file must be 4677 × 5881 PNG.'},400);
   const id=crypto.randomUUID(),token=secretToken(),key=secretToken(),now=Date.now();
   await env.BUCKET.put('prints/'+key+'.png',bytes,{httpMetadata:{contentType:'image/png'}});
   await env.DB.prepare('INSERT INTO orders (id,token_hash,design,asset_key,state,mode,amount,created,updated) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,await digest(token),JSON.stringify(d),key,'pending',demo()?'demo':env.PRODIGI_ENV==='live'?'live':'test',TOTAL,now,now).run();
   if(demo())return json({id,token,url:'/order?id='+id+'&demo=1',demo:true});
   const b=new URLSearchParams({'mode':'payment','client_reference_id':id,'metadata[order_id]':id,'payment_method_types[0]':'card','shipping_address_collection[allowed_countries][0]':'US','line_items[0][quantity]':'1','line_items[0][price_data][currency]':'usd','line_items[0][price_data][unit_amount]':String(PRICE),'line_items[0][price_data][product_data][name]':'Elsewhere — '+d.place,'line_items[0][price_data][product_data][description]':`${d.landscape} / ${d.color} / ${d.size.toUpperCase()} / personalized front print`,'shipping_options[0][shipping_rate_data][type]':'fixed_amount','shipping_options[0][shipping_rate_data][fixed_amount][amount]':String(SHIPPING),'shipping_options[0][shipping_rate_data][fixed_amount][currency]':'usd','shipping_options[0][shipping_rate_data][display_name]':'Standard US delivery','success_url':env.SITE_URL+'/order?id='+id,'cancel_url':env.SITE_URL+'/?canceled=1#studio'});
   const session=await stripe('checkout/sessions',b,id);
   await env.DB.prepare('UPDATE orders SET session_id=?,updated=? WHERE id=?').bind(session.id,Date.now(),id).run();
   return json({id,token,url:session.url,demo:false});
  }
  if(/^orders\/[0-9a-f-]{36}\/confirm$/.test(path)){
   const id=path.split('/')[1],o=await orderFor(req,id);if(!o)return json({error:'Order not found'},404);
   if(o.mode==='demo'){if(!demo())return json({error:'Demo is disabled'},403);await env.DB.prepare("UPDATE orders SET state='demo_completed',updated=? WHERE id=? AND mode='demo'").bind(Date.now(),id).run();return json({demo:true});}
   await fulfill(id);return json({ok:true});
  }
  return json({error:'Not found'},404);
 }catch(e:any){if(e.name==='ZodError')return json({error:e.issues?.[0]?.message??'Check your customization'},400);return json({error:e.message==='Payment has not been verified for this order'?'Payment has not succeeded. Nothing has been sent to print.':'Unable to complete this step. Please retry; your payment and print submission are protected against duplicates.'},503);}
}
