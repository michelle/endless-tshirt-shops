const SKU = 'GLOBAL-TEE-GIL-64000';
const PRICE = 3600, SHIPPING = 500, TOTAL = PRICE + SHIPPING;
const WIDTH = 4677, HEIGHT = 5881;
const MAX_BODY = 12 * 1024 * 1024;
class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const now=()=>Math.floor(Date.now()/1000);
const uuid=()=>crypto.randomUUID();
const config=env=>({sandbox:env.PRODIGI_ENV!=='live',payments:!!env.STRIPE_SECRET_KEY,checkoutReady:!!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.PRODIGI_API_KEY),price:PRICE,shipping:SHIPPING,currency:'USD',width:WIDTH,height:HEIGHT});
function requireReady(env){
 if(!config(env).checkoutReady) throw new HttpError(503,'Checkout is awaiting the store’s Stripe connection. You can customize and download your design now.');
 const live=env.PRODIGI_ENV==='live';
 if(live!==env.STRIPE_SECRET_KEY.startsWith('sk_live_')) throw new HttpError(503,'Payment and print environments must match. Checkout is temporarily unavailable.');
}
function origin(env,request){return env.STORE_ORIGIN || new URL(request.url).origin;}
function sameOrigin(request,env){if(request.headers.get('Origin')!==origin(env,request))throw new HttpError(403,'Please use checkout from this store.');}
async function readJSON(request,max=MAX_BODY){
 if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))throw new HttpError(415,'JSON is required.');
 if(Number(request.headers.get('Content-Length'))>max)throw new HttpError(413,'Print file is too large.');
 const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'A request body is required.');
 let size=0;const chunks=[];for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new HttpError(413,'Print file is too large.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let p=0;for(const chunk of chunks){bytes.set(chunk,p);p+=chunk.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new HttpError(400,'Invalid JSON.');}
}
function validateDesign(d){
 if(!d || typeof d!=='object')throw new HttpError(400,'Please complete your design.');
 for(const [key,max] of [['place',22],['caption',32]]){if(typeof d[key]!=='string'||d[key].trim().length<1||d[key].length>max||!/^[\x20-\x7E]+$/.test(d[key]))throw new HttpError(400,'Use 1–'+max+' letters, numbers, or punctuation for '+key+'.');}
 if(typeof d.lat!=='number'||!Number.isFinite(d.lat)||Math.abs(d.lat)>90||typeof d.lon!=='number'||!Number.isFinite(d.lon)||Math.abs(d.lon)>180)throw new HttpError(400,'Enter valid latitude and longitude.');
 if(typeof d.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||isNaN(Date.parse(d.date+'T12:00:00Z'))||new Date(d.date+'T12:00:00Z').toISOString().slice(0,10)!==d.date||d.date<'1900-01-01'||d.date>'2100-12-31')throw new HttpError(400,'Choose a valid date between 1900 and 2100.');
 if(!['black','natural','white'].includes(d.color)||!['s','m','l','xl','2xl'].includes(d.size)||!['tide','ember','blue'].includes(d.palette))throw new HttpError(400,'Choose an available shirt, size, and palette.');
 return {place:d.place.trim(),caption:d.caption.trim(),lat:d.lat,lon:d.lon,date:d.date,color:d.color,size:d.size,palette:d.palette};
}
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n>>>1)^((n&1)?0xedb88320:0);return n>>>0;});
function crc32(bytes){let crc=0xffffffff;for(let i=0;i<bytes.length;i++)crc=(crc>>>8)^crcTable[(crc^bytes[i])&255];return (crc^0xffffffff)>>>0;}
function validatePNG(base64){
 if(typeof base64!=='string'||base64.length<100||base64.length>MAX_BODY-4096||!/^[A-Za-z0-9+/]+={0,2}$/.test(base64))throw new HttpError(400,'A PNG print file is required.');
 let raw;try{raw=atob(base64);}catch{throw new HttpError(400,'Invalid print file.');}
 const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);const v=new DataView(bytes.buffer);
 if(bytes.length<33||[137,80,78,71,13,10,26,10].some((n,i)=>bytes[i]!==n)||v.getUint32(8)!==13||String.fromCharCode(...bytes.slice(12,16))!=='IHDR'||v.getUint32(16)!==WIDTH||v.getUint32(20)!==HEIGHT||bytes[24]!==8||bytes[25]!==6)throw new HttpError(400,'Print artwork must be a '+WIDTH+' × '+HEIGHT+' transparent RGBA PNG.');
 let offset=8,hasData=false,hasEnd=false,chunkCount=0;
 while(offset+12<=bytes.length){
  if(++chunkCount>2048)throw new HttpError(400,'Invalid PNG structure.');
  const length=v.getUint32(offset),end=offset+12+length;
  if(end>bytes.length||crc32(bytes.subarray(offset+4,end-4))!==v.getUint32(end-4))throw new HttpError(400,'Print file is incomplete or corrupted.');
  const type=String.fromCharCode(...bytes.slice(offset+4,offset+8));
  if(type==='IDAT'&&length>0)hasData=true;
  if(type==='IEND'){if(length!==0||end!==bytes.length)throw new HttpError(400,'Invalid PNG ending.');hasEnd=true;}
  offset=end;
 }
 if(!hasData||!hasEnd||offset!==bytes.length)throw new HttpError(400,'Print file is incomplete.');
 return bytes;
}
async function stripe(env,path,body,idempotency){
 const headers={Authorization:'Bearer '+env.STRIPE_SECRET_KEY,'Stripe-Version':'2025-02-24.acacia'};
 if(idempotency)headers['Idempotency-Key']=idempotency;
 if(body)headers['Content-Type']='application/x-www-form-urlencoded';
 const response=await fetch('https://api.stripe.com/v1/'+path,{method:body?'POST':'GET',headers,body:body?new URLSearchParams(body):undefined,signal:AbortSignal.timeout(25000)});
 const data=await response.json();if(!response.ok){console.error('stripe_request_failed',response.status,data.error?.code);throw new HttpError(502,'Payment provider is temporarily unavailable. Please try again.');}return data;
}
async function prodigi(env,path,body){
 const base=env.PRODIGI_ENV==='live'?'https://api.prodigi.com/v4.0/':'https://api.sandbox.prodigi.com/v4.0/';
 const response=await fetch(base+path,{method:body?'POST':'GET',headers:{'X-API-Key':env.PRODIGI_API_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(25000)});
 const data=await response.json();if(!response.ok){console.error('prodigi_request_failed',response.status,data.outcome);throw new HttpError(502,'Print provider is temporarily unavailable. Your paid order is saved and will be retried.');}return data;
}
async function rateLimit(env,request){
 const ip=request.headers.get('CF-Connecting-IP')||'local';
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip));
 const key=Array.from(new Uint8Array(hash)).map(n=>n.toString(16).padStart(2,'0')).join('')+':'+Math.floor(now()/3600);
 const row=await env.DB.prepare('INSERT INTO rate_limits(key,count) VALUES (?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key).first();
 if(row.count>10)throw new HttpError(429,'Too many checkout attempts. Please try again in an hour.');
}
async function checkout(request,env){
 sameOrigin(request,env);requireReady(env);await rateLimit(env,request);
 const body=await readJSON(request),design=validateDesign(body.design);
 if(!/^[a-f0-9-]{36}$/.test(body.requestId||''))throw new HttpError(400,'Invalid checkout request.');
 // Verify availability before accepting a payment, including chosen size/color.
 const product=(await prodigi(env,'products/'+SKU)).product;
 if(!product?.variants?.some(v=>v.attributes.size===design.size&&v.attributes.color===design.color&&v.shipsTo.includes('US')))throw new HttpError(409,'This shirt is temporarily unavailable. Choose another color or size.');
 const png=validatePNG(body.png);
 let order=await env.DB.prepare('SELECT * FROM orders WHERE request_id=?').bind(body.requestId).first();
 if(!order){
  const id=uuid(),statusToken=uuid(),assetKey='prints/'+uuid()+'.png';
  await env.BUCKET.put(assetKey,png,{httpMetadata:{contentType:'image/png'}});
  await env.DB.prepare('INSERT OR IGNORE INTO orders (id,status_token,request_id,design,asset_key,amount,payment_mode,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,statusToken,body.requestId,JSON.stringify(design),assetKey,TOTAL,env.PRODIGI_ENV==='live'?'live':'test',now(),now()).run();
  order=await env.DB.prepare('SELECT * FROM orders WHERE request_id=?').bind(body.requestId).first();
  if(order.id!==id)await env.BUCKET.delete(assetKey);
 }
 if(order.design!==JSON.stringify(design))throw new HttpError(409,'Your design changed. Please start a new checkout.');
 let session;
 if(order.session_id){session=await stripe(env,'checkout/sessions/'+encodeURIComponent(order.session_id));if(session.status!=='open')throw new HttpError(409,'This checkout is closed. Start a new checkout or use your saved order link.');}
 else{
  const url=origin(env,request);
  const args={mode:'payment','payment_method_types[0]':'card','line_items[0][price_data][currency]':'usd','line_items[0][price_data][unit_amount]':String(PRICE),'line_items[0][price_data][product_data][name]':'Somewhere Yours — '+design.place,'line_items[0][price_data][product_data][description]':design.color+' / '+design.size.toUpperCase()+' / personalized front print','line_items[0][quantity]':'1','shipping_options[0][shipping_rate_data][type]':'fixed_amount','shipping_options[0][shipping_rate_data][fixed_amount][amount]':String(SHIPPING),'shipping_options[0][shipping_rate_data][fixed_amount][currency]':'usd','shipping_options[0][shipping_rate_data][display_name]':'US standard shipping','shipping_address_collection[allowed_countries][0]':'US','billing_address_collection':'required','phone_number_collection[enabled]':'true','client_reference_id':order.id,'metadata[order_id]':order.id,'success_url':url+'/order/'+order.id+'?token='+order.status_token,'cancel_url':url+'/?checkout=cancelled#studio','expires_at':String(now()+1800)};
  if(env.STRIPE_AUTOMATIC_TAX==='true')args['automatic_tax[enabled]']='true';
  session=await stripe(env,'checkout/sessions',args,'checkout-'+order.id);
  await env.DB.prepare('UPDATE orders SET session_id=?, updated_at=? WHERE id=?').bind(session.id,now(),order.id).run();
 }
 return json({url:session.url,orderId:order.id,orderToken:order.status_token});
}
function recipientFrom(session){
 const shipping=session.shipping_details||session.collected_information?.shipping_details;
 const a=shipping?.address;
 if(!shipping?.name||!a?.line1||!a.city||!a.postal_code||a.country!=='US')throw new HttpError(422,'The paid order needs a valid US shipping address. Please contact the store with your order reference.');
 return {name:shipping.name,email:session.customer_details?.email,phoneNumber:session.customer_details?.phone,address:{line1:a.line1,line2:a.line2||'',townOrCity:a.city,postalOrZipCode:a.postal_code,countryCode:a.country,stateOrCounty:a.state||''}};
}
async function fulfill(env,order,request){
 requireReady(env);
 if(order.prodigi_id)return {status:order.status,prodigiId:order.prodigi_id};
 if(!order.session_id)return {status:'pending_payment'};
 // Never trust redirect parameters or a client-provided payment result.
 const session=await stripe(env,'checkout/sessions/'+encodeURIComponent(order.session_id));
 if(session.payment_status!=='paid')return {status:'pending_payment'};
 if(session.status!=='complete'||session.metadata?.order_id!==order.id||session.client_reference_id!==order.id||session.currency!=='usd'||session.amount_subtotal!==PRICE||session.amount_total<TOTAL||session.total_details?.amount_shipping!==SHIPPING||session.livemode!==(order.payment_mode==='live')||session.livemode!==(env.PRODIGI_ENV==='live'))throw new HttpError(409,'Payment verification failed. Your order requires store review.');
 const recipient=recipientFrom(session);
 const lease=await env.DB.prepare("UPDATE orders SET status='submitting', recipient=?, lease_until=?, updated_at=? WHERE id=? AND prodigi_id IS NULL AND lease_until<? RETURNING id").bind(JSON.stringify(recipient),now()+120,now(),order.id,now()).first();
 if(!lease)return {status:'submitting'};
 try{
  const design=JSON.parse(order.design);
  const result=await prodigi(env,'orders',{merchantReference:order.id,idempotencyKey:order.id,shippingMethod:'Standard',recipient,items:[{merchantReference:order.id,sku:SKU,copies:1,sizing:'fitPrintArea',attributes:{color:design.color,size:design.size},assets:[{printArea:'front',url:origin(env,request)+'/assets/'+order.asset_key.split('/')[1]}]}],metadata:{store:'Somewhere Yours',stripeCheckoutSession:session.id}});
  if(!result.order?.id)throw new Error('Print provider did not return an order ID.');
  const status=env.PRODIGI_ENV==='live'?'submitted':'sandbox_submitted';
  await env.DB.prepare('UPDATE orders SET status=?,prodigi_id=?,last_error=NULL,lease_until=0,updated_at=? WHERE id=?').bind(status,result.order.id,now(),order.id).run();
  return {status,prodigiId:result.order.id};
 }catch(error){
  await env.DB.prepare("UPDATE orders SET status='paid_fulfillment_error',last_error=?,lease_until=0,updated_at=? WHERE id=? AND prodigi_id IS NULL").bind('Print submission requires retry',now(),order.id).run();
  throw error;
 }
}
async function verifyWebhook(request,env){
 if(!env.STRIPE_WEBHOOK_SECRET)throw new HttpError(503,'Webhook is not configured.');
 const raw=await request.text();if(raw.length>262144)throw new HttpError(413,'Webhook is too large.');
 const entries=(request.headers.get('Stripe-Signature')||'').split(',').map(s=>s.split('='));
 const t=entries.find(e=>e[0]==='t')?.[1],signatures=entries.filter(e=>e[0]==='v1').map(e=>e[1]);
 if(!t||!/^\d+$/.test(t)||Math.abs(now()-Number(t))>300)throw new HttpError(400,'Invalid webhook signature.');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 let verified=false;
 for(const sig of signatures){if(!/^[a-f0-9]{64}$/.test(sig))continue;const bytes=new Uint8Array(sig.match(/../g).map(n=>parseInt(n,16)));if(await crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(t+'.'+raw)))verified=true;}
 if(!verified)throw new HttpError(400,'Invalid webhook signature.');
 try{return JSON.parse(raw);}catch{throw new HttpError(400,'Invalid webhook.');}
}
async function webhook(request,env){
 const event=await verifyWebhook(request,env);
 if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))return json({received:true});
 const session=event.data?.object,orderId=session?.metadata?.order_id;
 if(!orderId)return json({received:true});
 const order=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(orderId).first();
 if(!order||!order.session_id)throw new HttpError(503,'Order is not ready. Please retry.');
 if(order.session_id!==session.id)throw new HttpError(400,'Checkout session mismatch.');
 const result=await fulfill(env,order,request);
 if(result.status==='submitting')throw new HttpError(503,'Fulfillment is in progress. Please retry.');
 return json({received:true,...result});
}
async function getOrder(env,id,token){
 if(!/^[a-f0-9-]{36}$/.test(id)||!/^[a-f0-9-]{36}$/.test(token||''))throw new HttpError(404,'Order not found.');
 const order=await env.DB.prepare('SELECT * FROM orders WHERE id=? AND status_token=?').bind(id,token).first();
 if(!order)throw new HttpError(404,'Order not found.');return order;
}
async function handle(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(request.method==='GET'&&(path==='/'||/^\/order\/[a-f0-9-]{36}$/.test(path)))return new Response(PAGE,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
 if(request.method==='GET'&&path==='/app.js')return new Response(APP,{headers:{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'public, max-age=300'}});
 if(request.method==='GET'&&path==='/api/config')return json(config(env));
 if(request.method==='POST'&&path==='/api/checkout')return checkout(request,env);
 if(request.method==='POST'&&path==='/api/stripe/webhook')return webhook(request,env);
 const orderPath=path.match(/^\/api\/orders\/([a-f0-9-]{36})(\/reconcile)?$/);
 if(orderPath){
  const order=await getOrder(env,orderPath[1],url.searchParams.get('token'));
  if(request.method==='POST'&&orderPath[2]){sameOrigin(request,env);return json(await fulfill(env,order,request));}
  if(request.method==='GET'&&!orderPath[2]){
   let shipment=null;
   if(order.prodigi_id&&env.PRODIGI_ENV==='live'){try{const result=await prodigi(env,'orders/'+encodeURIComponent(order.prodigi_id));const sh=result.order?.shipments?.find(s=>s.tracking);shipment=sh?{carrier:sh.carrier?.name,trackingNumber:sh.tracking?.number,trackingUrl:sh.tracking?.url}:null;}catch{}}
   return json({id:order.id,status:order.status,design:JSON.parse(order.design),amount:order.amount,prodigiId:order.prodigi_id,shipment,paymentMode:order.payment_mode,createdAt:order.created_at});
  }
 }
 const asset=path.match(/^\/assets\/([a-f0-9-]{36}\.png)$/);
 if(asset&&['GET','HEAD'].includes(request.method)){
  const object=await env.BUCKET.get('prints/'+asset[1]);if(!object)throw new HttpError(404,'Artwork not found.');
  return new Response(request.method==='HEAD'?null:object.body,{headers:{'Content-Type':'image/png','Content-Length':String(object.size),'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});
 }
 throw new HttpError(404,'Page not found.');
}
export default {
 async fetch(request,env){
  let response;
  try{response=await handle(request,env);}catch(error){console.error('request_failed',error.status||500,error instanceof HttpError?error.message:'Internal error');response=json({error:error instanceof HttpError?error.message:'Something went wrong. Please try again.'},error.status||500);}
  const headers=new Headers(response.headers);
  headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer');headers.set('X-Frame-Options','SAMEORIGIN');
  headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self' https://checkout.stripe.com; frame-ancestors 'self'");
  return new Response(response.body,{status:response.status,headers});
 }
};
export {validateDesign,validatePNG,fulfill,verifyWebhook,checkout,recipientFrom,config};
