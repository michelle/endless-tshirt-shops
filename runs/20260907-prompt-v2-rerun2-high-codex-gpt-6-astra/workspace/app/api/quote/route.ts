import { cart,country,subtotal,prodigi,quoteItems,sign,readBody,json,failure,StoreError } from '@/lib/commerce';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(req:Request){try{
 const body=await readBody(req);const items=cart(body.items);const destination=country(body.country);
 const data=await prodigi('quotes',{shippingMethod:'Standard',destinationCountryCode:destination,currencyCode:'USD',items:quoteItems(items)});
 const q=data.quotes?.find((v:any)=>v.shipmentMethod==='Standard');
 if(!q||q.costSummary.shipping.currency!=='USD')throw new StoreError('Shipping is unavailable for this selection.',422);
 const shipping=Math.round(Number(q.costSummary.shipping.amount)*100);
 if(!Number.isSafeInteger(shipping)||shipping<0)throw new StoreError('Unable to calculate shipping.',502);
 const totals={subtotal:subtotal(items),shipping,tax:0,total:subtotal(items)+shipping};
 return json({...totals,currency:'USD',mode:'sandbox',token:sign({kind:'quote',items,country:destination,...totals,exp:Date.now()+20*60*1000})});
}catch(e){return failure(e);}}
