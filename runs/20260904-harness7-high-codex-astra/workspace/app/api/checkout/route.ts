import {NextResponse} from 'next/server';
import {catalog,orderSchema,PRICE,SHIPPING} from '@/lib/catalog';
import {stripe,appUrl,assertOrigin,isSandbox} from '@/lib/config';
import {quote} from '@/lib/prodigi';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(request:Request){
 try{assertOrigin(request)}catch{return NextResponse.json({error:'Request origin is not allowed.'},{status:403})}
 if(Number(request.headers.get('content-length')||0)>4096)return NextResponse.json({error:'Request too large.'},{status:413});
 let raw;try{raw=await request.json()}catch{return NextResponse.json({error:'Invalid request.'},{status:400})}
 const parsed=orderSchema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'Please select a valid fit, size, and moment.'},{status:400});
 const {fit,size,timestamp,requestId}=parsed.data;
 if(timestamp>Date.now()+60000||timestamp<Date.now()-60*60*1000)return NextResponse.json({error:'This moment is over an hour old. Close this dialog and capture a new one.'},{status:400});
 try{await quote(fit,size);const client=stripe();const metadata={shop:'datetime.store',fit,size,timestamp:String(timestamp),sku:catalog[fit].sku,artworkVersion:'1',shopMode:isSandbox()?'sandbox':'live',fulfillment_status:'awaiting_payment'};
 const session=await client.checkout.sessions.create({mode:'payment',payment_method_types:['card'],shipping_address_collection:{allowed_countries:['US']},billing_address_collection:'required',line_items:[{price_data:{currency:'usd',unit_amount:PRICE,product_data:{name:'The datetime tee',description:`${catalog[fit].name} · ${size} · Black / white print · ${timestamp}`,metadata:{sku:catalog[fit].sku}}},quantity:1}],shipping_options:[{shipping_rate_data:{display_name:'Standard US shipping',type:'fixed_amount',fixed_amount:{amount:SHIPPING,currency:'usd'}}}],metadata,payment_intent_data:{metadata},success_url:appUrl()+'/order?session_id={CHECKOUT_SESSION_ID}',cancel_url:appUrl()+'/?cancelled=1',custom_text:{submit:{message:isSandbox()?'Sandbox order: no payment is collected and no shirt will be shipped.':'Your timestamp is fixed. This tee will be made just for you.'}},...(process.env.STRIPE_AUTOMATIC_TAX==='true'?{automatic_tax:{enabled:true}}:{})},{idempotencyKey:`datetime-checkout-${requestId}`});
 return NextResponse.json({url:session.url},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('checkout_failed',e instanceof Error?e.message:'unknown');return NextResponse.json({error:'Checkout is temporarily unavailable. Your moment is saved here; please try again.'},{status:503})}
}
