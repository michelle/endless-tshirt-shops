import { config, db, getOrder, ready, type Order } from './store';
export async function stripe(path:string,body?:URLSearchParams,key?:string){
 const r=await fetch('https://api.stripe.com/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${config().STRIPE_SECRET_KEY}`,...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(key?{'Idempotency-Key':key}:{})},body});
 const data=await r.json() as any;if(!r.ok)throw new Error('Payment provider is unavailable');return data;
}
export async function verifySignature(raw:string,header:string,secret:string,now=Date.now()){
 const parts=header.split(',');const t=parts.find(p=>p.startsWith('t='))?.slice(2);const sigs=parts.filter(p=>p.startsWith('v1=')).map(p=>p.slice(3));
 if(!t||Math.abs(now/1000-Number(t))>300)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const result=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(t+'.'+raw)));
 const expected=Array.from(result,b=>b.toString(16).padStart(2,'0')).join('');
 return sigs.some(s=>{if(s.length!==expected.length)return false;let diff=0;for(let i=0;i<s.length;i++)diff|=s.charCodeAt(i)^expected.charCodeAt(i);return diff===0;});
}
export function checkPayment(session:any,order:Order,live:boolean){
 if(session.id!==order.session_id || session.metadata?.order_id!==order.id || session.payment_status!=='paid' || session.status!=='complete' || session.amount_total!==order.amount || session.currency!==order.currency || session.livemode!==live)throw new Error('Payment has not been verified');
}
export async function fulfill(sessionId:string){
 if(!ready())throw new Error('Payment and print environments are not configured consistently');
 const session=await stripe('checkout/sessions/'+encodeURIComponent(sessionId));
 const id=session.metadata?.order_id;if(!id)throw new Error('Order reference missing');
 const order=await getOrder(id);if(!order)throw new Error('Order not found');
 checkPayment(session,order,config().STORE_MODE==='live');
 if(order.prodigi_id)return order;
 const shipping=session.collected_information?.shipping_details ?? session.shipping_details;
 if(!shipping?.address || !shipping.name || shipping.address.country!=='US')throw new Error('Shipping address missing');
 const a=shipping.address;
 const recipient={name:shipping.name,email:session.customer_details?.email,address:{line1:a.line1,line2:a.line2||'',townOrCity:a.city,postalOrZipCode:a.postal_code,countryCode:a.country,stateOrCounty:a.state}};
 // Persist verified payment before fulfillment. Retries share a permanent provider idempotency key.
 await db().prepare("UPDATE orders SET status='paid', recipient=?, updated_at=? WHERE id=? AND prodigi_id IS NULL AND status='pending'").bind(JSON.stringify(recipient),Date.now(),id).run();
 const claim=await db().prepare("UPDATE orders SET status='submitting', updated_at=? WHERE id=? AND prodigi_id IS NULL AND (status='paid' OR status='fulfillment_error' OR (status='submitting' AND updated_at<?))").bind(Date.now(),id,Date.now()-120000).run();
 if(!claim.meta.changes)return await getOrder(id);
 const origin=config().SITE_URL;
 const payload={merchantReference:id,idempotencyKey:id,shippingMethod:'Standard',recipient,items:[{merchantReference:id+'-shirt',sku:'GLOBAL-TEE-BC-3001',copies:1,sizing:'fitPrintArea',attributes:{color:'navy blue',size:order.size},recipientCost:{amount:'42.00',currency:'USD'},assets:[{printArea:'front',url:origin+'/api/art/'+id+'?token='+order.token}]}],metadata:{stripeSessionId:sessionId,store:'Somewhere Studio'}};
 try{
 const host=config().PRODIGI_MODE==='live'?'api.prodigi.com':'api.sandbox.prodigi.com';
 const r=await fetch('https://'+host+'/v4.0/orders',{method:'POST',headers:{'X-API-Key':config().PRODIGI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const data=await r.json() as any;
 if(!r.ok||!data.order?.id)throw new Error('Print submission failed; payment is recorded.');
 await db().prepare("UPDATE orders SET prodigi_id=?,status='submitted',error=NULL,updated_at=? WHERE id=?").bind(data.order.id,Date.now(),id).run();
 }catch(e){await db().prepare("UPDATE orders SET status='fulfillment_error',error=?,updated_at=? WHERE id=? AND prodigi_id IS NULL").bind('Print submission needs retry',Date.now(),id).run();throw e;}
 return await getOrder(id);
}
