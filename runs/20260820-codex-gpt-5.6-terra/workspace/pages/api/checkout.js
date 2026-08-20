import Stripe from "stripe";
const PRICE = 2250;
export default async function handler(req,res) {
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  const {cut,size,timestamp}=req.body||{};
  if(!["fitted","unisex"].includes(cut)||!["S","M","L","XL"].includes(size)||!/^\d{13}$/.test(timestamp||"")) return res.status(400).json({error:"Please choose a shirt style and size."});
  if(!process.env.STRIPE_SECRET_KEY) return res.status(503).json({error:"Checkout is not configured yet."});
  try { const stripe=new Stripe(process.env.STRIPE_SECRET_KEY); const origin=req.headers.origin || `https://${req.headers.host}`;
    const session=await stripe.checkout.sessions.create({
      mode:"payment", payment_method_types:["card"], billing_address_collection:"required",
      shipping_address_collection:{allowed_countries:["US"]}, phone_number_collection:{enabled:true}, customer_creation:"always",
      line_items:[{
        price_data:{currency:"usd",unit_amount:PRICE,product_data:{name:"datetime.store t-shirt",description:`Black ${cut} · ${size} · timestamp ${timestamp}`,metadata:{cut,size,timestamp}}},
        quantity:1
      }],
      metadata:{cut,size,timestamp,fulfillment_status:"pending"},
      success_url:`${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${origin}/`
    });
    return res.status(200).json({url:session.url});
  } catch(e) { console.error("Stripe checkout error",e); return res.status(502).json({error:"Unable to create a secure checkout session."}); }
}
