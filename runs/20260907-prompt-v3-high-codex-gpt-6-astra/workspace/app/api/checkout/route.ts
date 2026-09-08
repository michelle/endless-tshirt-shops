import {createHmac} from 'node:crypto';
import {checkoutSchema,UNIT_PRICE,SHIPPING,SKU,STORE_ID} from '@/lib/design';
import {getOrigin,getStripe,apiError,assertOrigin,AppError} from '@/lib/config';
import {sign} from '@/lib/security';
import {checkAvailability} from '@/lib/prodigi';
export const runtime='nodejs';
export async function POST(req:Request){try{
 assertOrigin(req);
 if(Number(req.headers.get('content-length')||0)>4096)throw new AppError('Request is too large.',413);
 const text=await req.text();if(text.length>4096)throw new AppError('Request is too large.',413);
 let json;try{json=JSON.parse(text);}catch{throw new AppError('Invalid checkout details.',400);}
 const parsed=checkoutSchema.safeParse(json);if(!parsed.success)throw new AppError(parsed.error.issues[0].message,400);
 const stripe=getStripe();
 if(!process.env.STRIPE_WEBHOOK_SECRET)throw new AppError('Secure checkout is awaiting payment confirmation setup. Your design is saved; no payment has been taken.',503);
 const {design,size,quantity,requestId}=parsed.data; const fingerprint=JSON.stringify({design,size,quantity});
 const access=sign('order-access:'+requestId+':'+fingerprint),origin=getOrigin();
 await checkAvailability(size,quantity);
 const session=await stripe.checkout.sessions.create({
  mode:'payment',payment_method_types:['card'],shipping_address_collection:{allowed_countries:['US']},billing_address_collection:'required',
  line_items:[{quantity,price_data:{currency:'usd',tax_behavior:'exclusive',unit_amount:UNIT_PRICE,product_data:{name:'The Personal Orbit Tee',description:`${design.place} · ${design.date} · ${design.dedication} · ${design.palette} · Black / ${size.toUpperCase()}`,metadata:{sku:SKU}}}}],
  shipping_options:[{shipping_rate_data:{tax_behavior:'exclusive',type:'fixed_amount',fixed_amount:{amount:SHIPPING,currency:'usd'},display_name:'US standard shipping',delivery_estimate:{minimum:{unit:'business_day',value:7},maximum:{unit:'business_day',value:14}}}}],
  automatic_tax:{enabled:process.env.PAYMENTS_MODE==='live'},
  success_url:origin+'/order?session_id={CHECKOUT_SESSION_ID}&token='+access,cancel_url:origin+'/?canceled=1#customize',
  metadata:{store:STORE_ID,design:JSON.stringify(design),size,quantity:String(quantity),access_token:access,fulfillment_status:'awaiting_payment'},
  payment_intent_data:{metadata:{store:STORE_ID}},
  custom_text:{submit:{message:'Made to order. Confirm your design, size, and shipping address before paying.'}},
 },{idempotencyKey:createHmac('sha256',access).update('checkout:'+requestId).digest('hex')});
 if(!session.url)throw new AppError('Could not open checkout. Please try again.',502);
 return Response.json({url:session.url},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return apiError(e);}}
