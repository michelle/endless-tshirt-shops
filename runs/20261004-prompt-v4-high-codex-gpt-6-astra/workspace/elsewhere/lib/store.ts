import { env } from 'cloudflare:workers';
import { db } from '../db';
import { assertPaid, stripeRequest } from './payments';
import { SKU } from './design';
export const settings = () => env as any;
export function configuration() {
  const e=settings(), live=e.STORE_MODE==='live';
  const keyOkay = live ? /^sk_live_/.test(e.STRIPE_SECRET_KEY||'') : /^sk_test_/.test(e.STRIPE_SECRET_KEY||'');
  return {mode:live?'live':'sandbox',ready:!!(keyOkay&&e.STRIPE_WEBHOOK_SECRET&&e.PRODIGI_API_KEY&&e.SITE_URL&&(!live||e.PRODUCTION_READY==='true'))};
}
export async function prodigi(path:string, body?:any) {
  const e=settings(),origin=e.STORE_MODE==='live'?'https://api.prodigi.com':'https://api.sandbox.prodigi.com';
  const r=await fetch(`${origin}/v4.0/${path}`,{method:body?'POST':'GET',headers:{'X-API-Key':e.PRODIGI_API_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
  const data:any=await r.json();
  // A replay can return a duplicate outcome with the existing order.
  if (!r.ok && !data.order?.id) {console.error('Prodigi request failed',r.status,data.outcome);throw new Error('The print partner could not process your order yet.');}
  return data;
}
export async function fulfill(id:string) {
  const e=settings(),database=db();
  let order:any=await database.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  if(!order||!order.session_id)throw new Error('Order not found.');
  if(order.prodigi_id)return order;
  const session=await stripeRequest(e.STRIPE_SECRET_KEY,`checkout/sessions/${encodeURIComponent(order.session_id)}`);
  if(!assertPaid(session,order,e.STORE_MODE==='live'))return order;
  // Atomic lease + Prodigi's permanent idempotency key protect simultaneous
  // webhooks, browser refreshes, and a crash after the upstream accepted an order.
  const now=Date.now();
  const claimed=await database.prepare("UPDATE orders SET status = 'paid', lease_until = ?, updated_at = ? WHERE id = ? AND prodigi_id IS NULL AND lease_until < ?").bind(now+60000,now,id,now).run();
  if(!claimed.meta.changes)throw new Error('Your paid order is being processed. Please check again shortly.');
  try {
    const shipping=session.shipping_details||session.collected_information?.shipping_details;
    const a=shipping?.address;
    if(!shipping?.name||!a?.line1||!a?.city||!a?.postal_code||!a?.state||a.country!=='US')throw new Error('The delivery address needs review before printing.');
    if(!await e.BUCKET.head(order.asset_key))throw new Error('The saved print file is unavailable.');
    const result=await prodigi('orders',{
      merchantReference:id,idempotencyKey:id,shippingMethod:'Standard',
      recipient:{name:shipping.name,email:session.customer_details?.email,phoneNumber:session.customer_details?.phone,
        address:{line1:a.line1,line2:a.line2||'',postalOrZipCode:a.postal_code,countryCode:a.country,townOrCity:a.city,stateOrCounty:a.state}},
      items:[{merchantReference:`${id}-1`,sku:SKU,copies:1,sizing:'fitPrintArea',attributes:{color:'black',size:order.size},assets:[{printArea:'front',url:`${e.SITE_URL}/api/artwork/${id}/${order.asset_token}.pdf`}]}],
      metadata:{store:'ELSEWHERE',artworkVersion:1,stripeSession:session.id},
    });
    if(!result.order?.id)throw new Error('The print partner has not confirmed the order.');
    await database.prepare("UPDATE orders SET status = 'submitted', prodigi_id = ?, error = NULL, lease_until = 0, updated_at = ? WHERE id = ?").bind(result.order.id,Date.now(),id).run();
  } catch(err:any) {
    await database.prepare("UPDATE orders SET status = 'fulfillment_pending', error = ?, lease_until = 0, updated_at = ? WHERE id = ? AND prodigi_id IS NULL").bind(err.message.slice(0,250),Date.now(),id).run();
    throw err;
  }
  return await database.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
}
