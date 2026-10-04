import { db } from '../../../db';
import { validateDesign, SIZES, PRICE, SHIPPING, SKU } from '../../../lib/design';
import { printPdf } from '../../../lib/print';
import { stripeRequest, verifyWebhook } from '../../../lib/payments';
import { configuration, settings, fulfill, prodigi } from '../../../lib/store';
const json=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
async function body(req:Request){if(Number(req.headers.get('content-length')||0)>10000)throw new Error('Request is too large.');const raw=await req.text();if(raw.length>10000)throw new Error('Request is too large.');return JSON.parse(raw);}
export async function GET(req:Request) {
  const url=new URL(req.url),path=url.pathname,e=settings();
  try {
    if(path==='/api/config')return json(configuration());
    if(path.startsWith('/api/artwork/')) {
      const [, , ,id,file]=path.split('/');
      const token=file?.replace(/\.pdf$/,'');
      const row:any=await db().prepare('SELECT asset_key FROM orders WHERE id = ? AND asset_token = ?').bind(id,token||'').first();
      if(!row)return json({error:'Artwork not found.'},404);
      const object=await e.BUCKET.get(row.asset_key);if(!object)return json({error:'Artwork not found.'},404);
      return new Response(object.body,{headers:{'Content-Type':'application/pdf','Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
    }
    if(path==='/api/order') {
      const id=url.searchParams.get('id'),token=url.searchParams.get('token');
      if(!id||!token)return json({error:'This private order link is incomplete.'},400);
      const row:any=await db().prepare('SELECT * FROM orders WHERE id = ? AND token = ?').bind(id,token).first();
      if(!row)return json({error:'Order not found. Please use your original order link.'},404);
      let printStatus:any=null;
      if(row.prodigi_id){try{const result=await prodigi(`orders/${encodeURIComponent(row.prodigi_id)}`);printStatus={stage:result.order?.status?.stage,shipments:(result.order?.shipments||[]).map((s:any)=>({carrier:s.carrier?.name,trackingNumber:s.tracking?.number,trackingUrl:s.tracking?.url})),hasIssues:!!result.order?.status?.issues?.length};}catch{}}
      return json({id:row.id,design:JSON.parse(row.design),size:row.size,status:row.status,amount:row.amount,mode:configuration().mode,prodigiId:row.prodigi_id,printStatus,error:row.error,artworkUrl:`/api/artwork/${row.id}/${row.asset_token}.pdf`});
    }
    return json({error:'Not found.'},404);
  }catch(err:any){console.error('Store read failed',err.message);return json({error:'This service is temporarily unavailable. Please try again.'},503);}
}
export async function POST(req:Request) {
  const url=new URL(req.url),path=url.pathname,e=settings();
  if(path==='/api/webhooks/stripe') {
    if(!e.STRIPE_WEBHOOK_SECRET)return json({error:'Webhook not configured.'},503);
    const raw=await req.text();if(raw.length>1000000)return json({error:'Too large.'},413);
    if(!await verifyWebhook(raw,req.headers.get('stripe-signature')||'',e.STRIPE_WEBHOOK_SECRET))return json({error:'Invalid signature.'},400);
    try {
      const event=JSON.parse(raw);
      if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)) {
        const session=event.data?.object;
        if(session?.metadata?.order_id)await fulfill(session.metadata.order_id);
      }
      if(event.type==='checkout.session.expired')await db().prepare("UPDATE orders SET status = 'expired', updated_at = ? WHERE session_id = ? AND status = 'awaiting_payment'").bind(Date.now(),event.data.object.id).run();
      return json({received:true});
    }catch(err:any){console.error('Webhook fulfillment delayed',err.message);return json({error:'Fulfillment pending. Retry this event.'},500);}
  }
  // Browser writes must originate from this store. Webhooks use signatures instead.
  const origin=req.headers.get('origin');
  if(origin&&origin!==url.origin&&origin!==e.SITE_URL)return json({error:'Invalid request origin.'},403);
  try {
    if(path==='/api/proof') {
      const design=validateDesign(await body(req));
      const bytes=await printPdf(design);
      return new Response(bytes.buffer as ArrayBuffer,{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="elsewhere-print-proof.pdf"','Cache-Control':'no-store'}});
    }
    if(path==='/api/checkout') {
      if(!configuration().ready)return json({error:'Payments are not connected yet. You can still personalize your shirt and download the artwork.'},503);
      const input=await body(req),design=validateDesign(input.design);
      if(!SIZES.includes(input.size)||input.approved!==true)return json({error:'Choose your size and approve your design.'},400);
      const quote=await prodigi('quotes',{shippingMethod:'Standard',destinationCountryCode:'US',currencyCode:'USD',items:[{sku:SKU,copies:1,attributes:{color:'black',size:input.size},assets:[{printArea:'front'}]}]});
      if(!quote.quotes?.length)throw new Error('This shirt is temporarily unavailable for US delivery.');
      const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID(),assetToken=crypto.randomUUID()+crypto.randomUUID(),assetKey=`prints/${id}/master-v1.pdf`;
      const bytes=await printPdf(design);
      await e.BUCKET.put(assetKey,bytes,{httpMetadata:{contentType:'application/pdf'}});
      await db().prepare('INSERT INTO orders (id, token, design, size, amount, asset_key, asset_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id,token,JSON.stringify(design),input.size,PRICE+SHIPPING,assetKey,assetToken,Date.now(),Date.now()).run();
      const p=new URLSearchParams({
        mode:'payment','payment_method_types[0]':'card',client_reference_id:id,'metadata[order_id]':id,
        'line_items[0][price_data][currency]':'usd','line_items[0][price_data][unit_amount]':String(PRICE),
        'line_items[0][price_data][product_data][name]':`ELSEWHERE - ${design.place}`,
        'line_items[0][price_data][product_data][description]':`Personalized black tee / ${input.size.toUpperCase()} / ${design.date} / ${design.palette}. Approved artwork ${id.slice(0,8)}.`,
        'line_items[0][quantity]':'1','shipping_address_collection[allowed_countries][0]':'US',
        'shipping_options[0][shipping_rate_data][type]':'fixed_amount','shipping_options[0][shipping_rate_data][fixed_amount][amount]':String(SHIPPING),
        'shipping_options[0][shipping_rate_data][fixed_amount][currency]':'usd','shipping_options[0][shipping_rate_data][display_name]':'US standard delivery',
        'phone_number_collection[enabled]':'true',
        success_url:`${e.SITE_URL}/order?id=${id}&token=${token}`,cancel_url:`${e.SITE_URL}/?checkout=cancelled`,
        'custom_text[submit][message]':configuration().mode==='sandbox'?'Test purchase. No shirt will be printed or shipped.':'Your personalized shirt will be sent to print after payment.',
      });
      const session=await stripeRequest(e.STRIPE_SECRET_KEY,'checkout/sessions',p,`checkout-${id}`);
      await db().prepare('UPDATE orders SET session_id = ?, updated_at = ? WHERE id = ?').bind(session.id,Date.now(),id).run();
      return json({url:session.url});
    }
    if(path==='/api/order/sync') {
      const {id,token}=await body(req);
      const row:any=await db().prepare('SELECT id FROM orders WHERE id = ? AND token = ?').bind(id||'',token||'').first();
      if(!row)return json({error:'Order not found.'},404);
      await fulfill(id);return json({ok:true});
    }
    return json({error:'Not found.'},404);
  }catch(err:any){console.error('Store request failed',err.message);return json({error:err instanceof SyntaxError?'Invalid request.':err.message||'Please try again.'},400);}
}
