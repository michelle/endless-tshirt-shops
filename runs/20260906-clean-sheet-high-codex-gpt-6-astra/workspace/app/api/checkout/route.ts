import {NextRequest,NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {cartSchema,products,PRICE,SHIPPING,SKU} from '../../../lib/catalog';
import {stripe,storeUrl,requireTestMode,prodigi} from '../../../lib/server';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 try{
  requireTestMode();if(req.headers.get('origin')!==storeUrl())return NextResponse.json({error:'Please start checkout from the store.'},{status:403});
  if(Number(req.headers.get('content-length')||0)>6000)return NextResponse.json({error:'Request too large.'},{status:413});
  const parsed=cartSchema.safeParse((await req.json()).items);if(!parsed.success)return NextResponse.json({error:'Check your bag. Choose a valid size and up to 10 shirts.'},{status:400});
  const items=parsed.data;
  const quote=await prodigi('/quotes',{shippingMethod:'Standard',destinationCountryCode:'US',currencyCode:'USD',items:items.map(i=>({sku:SKU,copies:i.quantity,attributes:{color:'black',size:i.size},assets:[{printArea:'front'}]}))});
  if(!quote.quotes?.length)throw Error('No available delivery quote');
  const session=await stripe().checkout.sessions.create({mode:'payment',payment_method_types:['card'],billing_address_collection:'required',shipping_address_collection:{allowed_countries:['US']},line_items:items.map(i=>({quantity:i.quantity,price_data:{currency:'usd',unit_amount:PRICE,product_data:{name:`${products.find(p=>p.id===i.id)!.name} — ${i.size.toUpperCase()}`,description:'Night Shift · Black Gildan 64000 · Front print',metadata:{design:i.id,size:i.size}}}})),shipping_options:[{shipping_rate_data:{display_name:'Standard US shipping',type:'fixed_amount',fixed_amount:{amount:SHIPPING,currency:'usd'}}}],metadata:{store:'night-shift-v1',artworkRevision:'v2',cart:JSON.stringify(items),orderRef:randomUUID()},success_url:`${storeUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${storeUrl()}/?checkout=cancelled#bag`,custom_text:{submit:{message:'Test order only. No charge or physical shipment. By continuing you agree to the store policies.'}}});
  return NextResponse.json({url:session.url});
 }catch(error){console.error('checkout_failed',error instanceof Error?error.message:'Unknown error');return NextResponse.json({error:'Checkout is temporarily unavailable. Your bag is saved. Please try again.'},{status:503});}
}
