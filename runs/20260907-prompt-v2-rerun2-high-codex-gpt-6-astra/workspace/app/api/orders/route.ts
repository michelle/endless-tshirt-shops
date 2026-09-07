import { cart,country,prodigi,verify,sign,digest,recipient,readBody,json,failure,StoreError } from '@/lib/commerce';
import { productFor } from '@/lib/catalog';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(req:Request){try{
 const b=await readBody(req);
 if(b.sandboxAcknowledged!==true)throw new StoreError('Please acknowledge that this is a test order.');
 if(typeof b.checkoutId!=='string'||!/^[0-9a-f-]{36}$/i.test(b.checkoutId))throw new StoreError('Invalid checkout reference.');
 const q=verify(b.quoteToken);if(q.kind!=='quote'||q.exp<Date.now())throw new StoreError('Your shipping quote expired. Please calculate it again.',409);
 const items=cart(q.items);const dest=country(q.country);const to=recipient(b.recipient,dest);
 const base=process.env.SITE_URL;if(!base?.startsWith('https://'))throw new StoreError('Checkout is not configured.',503);
 const reference=`AWC-${b.checkoutId}`;
 const data=await prodigi('orders',{
  shippingMethod:'Standard',merchantReference:reference,idempotencyKey:digest(`order:${b.checkoutId}`),recipient:to,
  items:items.map(i=>({merchantReference:`${i.productId}:${i.size}`,sku:'GLOBAL-TEE-GIL-64000',copies:i.quantity,sizing:'fitPrintArea',attributes:{color:productFor(i.productId)!.color,size:i.size},assets:[{printArea:'front',url:`${base}${productFor(i.productId)!.art}`}]})),
  metadata:{store:'Amateur Weather Club',mode:'sandbox',retailTotalCents:q.total,retailCurrency:'USD',paymentStatus:'not_charged'}
 });
 if(!data.order?.id)throw new StoreError('The print service did not confirm the order. Retry with the same checkout reference.',502);
 const order=data.order;
 return json({id:order.id,reference:order.merchantReference,stage:order.status?.stage,hasIssues:!!order.status?.issues?.length,mode:'sandbox',receipt:sign({kind:'order',id:order.id}),total:q.total},201);
}catch(e){return failure(e);}}
