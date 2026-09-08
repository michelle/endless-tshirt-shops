import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createArtworkToken } from "@/lib/artwork-token";
import { orderSchema } from "@/lib/order";

export const runtime = "nodejs";
function siteUrl(request:Request){ return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin; }
export async function POST(request:Request){
  try {
    if(!process.env.STRIPE_SECRET_KEY) return NextResponse.json({error:"Checkout is being configured. Add Stripe test keys to activate payments."},{status:503});
    const parsed=orderSchema.safeParse(await request.json());
    if(!parsed.success) return NextResponse.json({error:parsed.error.issues[0]?.message||"Please check your personalization."},{status:400});
    const order=parsed.data; const origin=siteUrl(request); const token=await createArtworkToken(order);
    const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
    const session=await stripe.checkout.sessions.create({
      mode:"payment", submit_type:"pay", customer_creation:"always", phone_number_collection:{enabled:true},
      shipping_address_collection:{allowed_countries:["US"]},
      line_items:[{quantity:order.quantity,price_data:{currency:"usd",unit_amount:3900,product_data:{name:`The ${order.time} Club Tee`,description:`${order.name}'s personalized daily legend`,images:[`${origin}/hero-tee.png`]}}}],
      shipping_options:[{shipping_rate_data:{type:"fixed_amount",fixed_amount:{amount:1099,currency:"usd"},display_name:"Standard shipping",delivery_estimate:{minimum:{unit:"business_day",value:5},maximum:{unit:"business_day",value:10}}}}],
      metadata:{order:JSON.stringify(order),artworkToken:token},
      success_url:`${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${origin}/?checkout=cancelled#make`,
      ...(process.env.STRIPE_AUTOMATIC_TAX==="true"?{automatic_tax:{enabled:true}}:{}),
    });
    if(!session.url) throw new Error("Stripe did not return a checkout link.");
    return NextResponse.json({url:session.url});
  } catch(error) { console.error("checkout",error); return NextResponse.json({error:error instanceof Error?error.message:"Couldn’t start checkout."},{status:500}); }
}
