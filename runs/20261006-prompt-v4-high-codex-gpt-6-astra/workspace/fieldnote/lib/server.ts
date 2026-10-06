import { env } from 'cloudflare:workers';
import { validateDesign } from './design';
import { assertPaid, verifyStripeSignature } from './payment';
const e=()=>env as unknown as Record<string,any>;
const db=()=>e().DB as D1Database;
const bucket=()=>e().BUCKET as R2Bucket;
const origin=()=>e().PUBLIC_ORIGIN;
const live=()=>e().STORE_MODE==='live';
export function configured(){return Boolean(e().STRIPE_SECRET_KEY&&e().STRIPE_WEBHOOK_SECRET&&e().PRODIGI_API_KEY&&origin()&&(!live()||e().PRODIGI_ENV==='live')&&(live()?e().STRIPE_SECRET_KEY.startsWith('sk_live_'):e().STRIPE_SECRET_KEY.startsWith('sk_test_')));}
async function stripe(path:string,body?:URLSearchParams,key?:string){
 const r=await fetch(`https://api.stripe.com/v1/${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${e().STRIPE_SECRET_KEY}`,'Stripe-Version':'2025-02-24.acacia',...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(key?{'Idempotency-Key':key}:{})},body,signal:AbortSignal.timeout(15000)});
 const data=await r.json() as any;if(!r.ok)throw Error('Payment service unavailable. Please try again.');return data;
}
export async function prodigi(path:string,body?:any){
 const r=await fetch(`https://${live()?'api':'api.sandbox'}.prodigi.com/v4.0/${path}`,{method:body?'POST':'GET',headers:{'X-API-Key':e().PRODIGI_API_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});const data=await r.json() as any;
 if(!r.ok&&!data.order?.id)throw Error(`Print service error (${r.status}).`);return data;
}
async function limit(req:Request){
 const ip=req.headers.get('cf-connecting-ip')||'local';const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip));const key=`${Array.from(new Uint8Array(hash)).slice(0,8).map(x=>x.toString(16)).join('')}:${Math.floor(Date.now()/3600000)}`;
 const row=await db().prepare('INSERT INTO rate_limits (key,count) VALUES (?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key).first<{count:number}>();if(row!.count>12)throw Error('Too many checkout attempts. Please try again in an hour.');
}
async function checkout(req:Request){
 if(!configured())return Response.json({error:'Checkout is not open yet. Payment credentials are still being configured.'},{status:503});
 if(req.headers.get('origin')!==origin())return Response.json({error:'Invalid request origin.'},{status:403});
 await limit(req);
 if(Number(req.headers.get('content-length'))>9_000_000)throw Error('Artwork is too large.');
 const form=await req.formData();const d=validateDesign(JSON.parse(String(form.get('design'))));const art=form.get('artwork');
 if(!(art instanceof File)||art.size>8_000_000||art.size<1000)throw Error('Invalid artwork file.');
 const bytes=await art.arrayBuffer();const h=new DataView(bytes);if(h.getUint32(0)!==0x89504e47||h.getUint32(4)!==0x0d0a1a0a||h.getUint32(12)!==0x49484452||h.getUint32(16)!==4677||h.getUint32(20)!==5881||h.getUint8(25)!==6)throw Error('Artwork must be a full-resolution transparent PNG.');
 // Availability is checked before taking payment. Only US shipping is sold.
 const q=await prodigi('quotes',{shippingMethod:'Standard',destinationCountryCode:'US',currencyCode:'USD',items:[{sku:'GLOBAL-TEE-GIL-64000',copies:1,attributes:{color:d.color,size:d.size},assets:[{printArea:'front'}]}]});
 if(!q.quotes?.some((x:any)=>x.shipments?.length&&x.costSummary?.totalCost))throw Error('This shirt is temporarily unavailable. Please try another size.');
 const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID(),assetKey=`art/${crypto.randomUUID()}.png`;
 await bucket().put(assetKey,bytes,{httpMetadata:{contentType:'image/png'}});
 await db().prepare('INSERT INTO orders (id,token,design,asset_key,status,total,created_at) VALUES (?,?,?,?,?,?,?)').bind(id,token,JSON.stringify(d),assetKey,'pending',4200,Date.now()).run();
 const p=new URLSearchParams({mode:'payment','payment_method_types[0]':'card','line_items[0][price_data][currency]':'usd','line_items[0][price_data][unit_amount]':'3600','line_items[0][price_data][product_data][name]':`Fieldnote / ${d.place}`,'line_items[0][price_data][product_data][description]':`${d.color} / ${d.size.toUpperCase()} / personalized front print`,'line_items[0][quantity]':'1','shipping_options[0][shipping_rate_data][type]':'fixed_amount','shipping_options[0][shipping_rate_data][fixed_amount][amount]':'600','shipping_options[0][shipping_rate_data][fixed_amount][currency]':'usd','shipping_options[0][shipping_rate_data][display_name]':'US standard shipping','shipping_address_collection[allowed_countries][0]':'US','client_reference_id':id,'metadata[order_id]':id,success_url:`${origin()}/order?id=${id}&token=${token}`,cancel_url:`${origin()}/?cancelled=1#studio`});
 const session=await stripe('checkout/sessions',p,id);
 await db().prepare('UPDATE orders SET session_id=? WHERE id=?').bind(session.id,id).run();return Response.json({url:session.url});
}
export async function fulfill(sessionId:string){
 const order=await db().prepare('SELECT * FROM orders WHERE session_id=?').bind(sessionId).first<any>();
 if(!order)throw Error('Order not ready. Retry webhook.');if(order.prodigi_id)return;
 const session=await stripe(`checkout/sessions/${encodeURIComponent(sessionId)}`);
 if(session.payment_status!=='paid')return;
 assertPaid(session,order,live());
 const shipping=session.shipping_details||session.collected_information?.shipping_details;const a=shipping?.address;
 if(!shipping?.name||!a?.line1||!a?.city||!a?.postal_code||a.country!=='US')throw Error('Paid order needs a valid US shipping address.');
 const d=JSON.parse(order.design);
 const payload={merchantReference:order.id,idempotencyKey:order.id,shippingMethod:'Standard',recipient:{name:shipping.name,email:session.customer_details?.email,address:{line1:a.line1,line2:a.line2||'',townOrCity:a.city,postalOrZipCode:a.postal_code,stateOrCounty:a.state||'',countryCode:'US'}},items:[{sku:'GLOBAL-TEE-GIL-64000',copies:1,sizing:'fitPrintArea',attributes:{color:d.color,size:d.size},recipientCost:{amount:'36.00',currency:'USD'},assets:[{printArea:'front',url:`${origin()}/api/art/${order.asset_key.split('/')[1]}`}]}]};
 // Freeze the first paid payload, so retries use the same content and permanent idempotency key.
 await db().prepare("UPDATE orders SET status='paid',paid_at=COALESCE(paid_at,?),fulfillment_payload=COALESCE(fulfillment_payload,?) WHERE id=? AND prodigi_id IS NULL").bind(Date.now(),JSON.stringify(payload),order.id).run();
 const stored=await db().prepare('SELECT fulfillment_payload FROM orders WHERE id=?').bind(order.id).first<any>();
 try{const r=await prodigi('orders',JSON.parse(stored.fulfillment_payload));if(!r.order?.id)throw Error('Print service did not return an order.');await db().prepare("UPDATE orders SET status='submitted',prodigi_id=?,last_error=NULL WHERE id=?").bind(r.order.id,order.id).run();}
 catch(err){await db().prepare("UPDATE orders SET status='fulfillment_pending',last_error=? WHERE id=? AND prodigi_id IS NULL").bind(String(err).slice(0,500),order.id).run();throw err;}
}
async function webhook(req:Request){
 if(!configured())return Response.json({error:'Payments are not configured.'},{status:503});
 const raw=await req.text();if(raw.length>1000000||!await verifyStripeSignature(raw,req.headers.get('stripe-signature')||'',e().STRIPE_WEBHOOK_SECRET))return Response.json({error:'Invalid signature.'},{status:400});
 const event=JSON.parse(raw);
 if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))await fulfill(event.data.object.id);
 return Response.json({received:true});
}
async function orderStatus(req:Request){
 const u=new URL(req.url),id=u.searchParams.get('id'),token=u.searchParams.get('token');
 const o=await db().prepare('SELECT * FROM orders WHERE id=? AND token=?').bind(id||'',token||'').first<any>();if(!o)return Response.json({error:'Order not found.'},{status:404});
 let stage=null,tracking:any[]=[];
 if(o.prodigi_id){try{const r=await prodigi(`orders/${o.prodigi_id}`);stage=r.order?.status?.stage;tracking=(r.order?.shipments||[]).flatMap((s:any)=>s.tracking?[s.tracking]:[]);}catch{}}
 return Response.json({id:o.id,status:o.status,design:JSON.parse(o.design),total:o.total,prodigiId:o.prodigi_id,stage,tracking,sandbox:!live()},{headers:{'Cache-Control':'no-store'}});
}
export async function handle(req:Request){
 const path=new URL(req.url).pathname;
 try{
 if(req.method==='GET'&&path==='/api/config')return Response.json({checkoutReady:configured(),sandbox:!live(),price:3600,shipping:600});
 if(req.method==='POST'&&path==='/api/checkout')return await checkout(req);
 if(req.method==='POST'&&path==='/api/stripe/webhook')return await webhook(req);
 if(req.method==='GET'&&path==='/api/order')return await orderStatus(req);
 if(req.method==='GET'&&/^\/api\/art\/[a-f0-9-]{36}\.png$/.test(path)){const obj=await bucket().get(`art/${path.split('/').pop()}`);return obj?new Response(obj.body,{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}}):new Response('Not found',{status:404});}
 if(req.method==='POST'&&path==='/api/admin/retry'){
  if(!e().ADMIN_TOKEN||req.headers.get('Authorization')!==`Bearer ${e().ADMIN_TOKEN}`)return new Response('Unauthorized',{status:401});
  const rows=await db().prepare("SELECT session_id FROM orders WHERE status IN ('paid','fulfillment_pending') LIMIT 25").all<any>();let succeeded=0;for(const o of rows.results){try{await fulfill(o.session_id);succeeded++;}catch{}}return Response.json({attempted:rows.results.length,succeeded});
 }
 return new Response('Not found',{status:404});
 }catch(err){console.error('Order operation failed:',String(err));return Response.json({error:path.includes('webhook')?'Fulfillment pending; retry delivery.':String(err instanceof Error?err.message:'Unable to complete request.')},{status:path.includes('webhook')?500:400});}
}
