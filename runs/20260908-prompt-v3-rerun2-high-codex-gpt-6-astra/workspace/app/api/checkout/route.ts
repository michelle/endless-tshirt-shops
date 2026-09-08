import {NextRequest,NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {designSchema,PRICE,SHIPPING} from '@/lib/design';
import {stripe,origin,sign,checkVariant} from '@/lib/server';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 try{
  if(req.headers.get('origin')!==origin())return NextResponse.json({error:'Invalid origin'},{status:403});
  if(Number(req.headers.get('content-length')||0)>6000)return NextResponse.json({error:'Request too large'},{status:413});
  const parsed=designSchema.safeParse(await req.json());
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||'Check your design.'},{status:400});
  const api=stripe(); if(/^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY||'')!==(process.env.PRODIGI_ENV==='live'))throw new Error('Payment and printing environment mismatch'); if(!process.env.STRIPE_WEBHOOK_SECRET||!process.env.ART_SIGNING_SECRET)throw new Error('Checkout safety configuration incomplete'); await checkVariant(parsed.data);
  const ref=randomUUID(),token=sign(`order:${ref}`);
  const s=await api.checkout.sessions.create({mode:'payment',payment_method_types:['card'],client_reference_id:ref,line_items:[{price_data:{currency:'usd',unit_amount:PRICE,product_data:{name:'Daymark — Your personal geography tee',description:`${parsed.data.place} · ${parsed.data.date} · Natural / ${parsed.data.size.toUpperCase()}`}},quantity:1}],shipping_address_collection:{allowed_countries:['US']},shipping_options:[{shipping_rate_data:{type:'fixed_amount',fixed_amount:{amount:SHIPPING,currency:'usd'},display_name:'Standard US shipping'}}],billing_address_collection:'required',success_url:`${origin()}/order?session_id={CHECKOUT_SESSION_ID}&token=${token}`,cancel_url:`${origin()}/?cancelled=1#studio`,metadata:{store:'daymark-v1',design:JSON.stringify(parsed.data),accessToken:token},payment_intent_data:{metadata:{store:'daymark-v1',reference:ref}}});
  return NextResponse.json({url:s.url});
 }catch(e){console.error('Checkout failed:',e instanceof Error?e.message:'unknown');return NextResponse.json({error:process.env.STRIPE_SECRET_KEY?'Checkout is temporarily unavailable. Your card has not been charged. Please try again.':'Checkout is not open yet. Payment credentials are being connected; no orders can be placed.'},{status:503});}
}
