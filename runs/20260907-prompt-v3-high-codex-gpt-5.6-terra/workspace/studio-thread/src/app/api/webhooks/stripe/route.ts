import Stripe from "stripe";
import { NextResponse } from "next/server";
import { sendToProdigi } from "@/lib/prodigi";
import { orderSchema } from "@/lib/order";

export const runtime = "nodejs";
export async function POST(request:Request){
  const stripeKey=process.env.STRIPE_SECRET_KEY; const signingSecret=process.env.STRIPE_WEBHOOK_SECRET;
  if(!stripeKey||!signingSecret) return NextResponse.json({error:"Webhook is not configured."},{status:503});
  const stripe=new Stripe(stripeKey); let event:Stripe.Event;
  try { event=stripe.webhooks.constructEvent(await request.text(),request.headers.get("stripe-signature")||"",signingSecret); } catch { return NextResponse.json({error:"Invalid Stripe signature."},{status:400}); }
  if(event.type!=="checkout.session.completed"&&event.type!=="checkout.session.async_payment_succeeded") return NextResponse.json({received:true});
  try {
    const session=event.data.object as Stripe.Checkout.Session;
    if(session.payment_status!=="paid") return NextResponse.json({received:true});
    const raw=session.metadata?.order; const artworkToken=session.metadata?.artworkToken;
    if(!raw||!artworkToken) throw new Error("Order metadata is missing.");
    const checked=orderSchema.safeParse(JSON.parse(raw)); if(!checked.success) throw new Error("Order metadata is invalid.");
    const legacy=session as Stripe.Checkout.Session & {shipping_details?: Stripe.Checkout.Session.CollectedInformation.ShippingDetails};
    const shipping=(session.collected_information?.shipping_details||legacy.shipping_details); const address=shipping?.address;
    if(!shipping||!address?.line1||!address.city||!address.postal_code||!address.country) throw new Error("Shipping details are missing.");
    const origin=process.env.NEXT_PUBLIC_SITE_URL; if(!origin) throw new Error("NEXT_PUBLIC_SITE_URL is required for fulfillment.");
    await sendToProdigi({order:checked.data,artworkUrl:`${origin}/api/artwork/${artworkToken}`,reference:session.id,shipping:{name:shipping.name,email:session.customer_details?.email,line1:address.line1,line2:address.line2,city:address.city,state:address.state,postalCode:address.postal_code,country:address.country}});
    return NextResponse.json({received:true});
  } catch(error) { console.error("fulfillment",error); return NextResponse.json({error:"Fulfillment could not be started."},{status:500}); }
}
