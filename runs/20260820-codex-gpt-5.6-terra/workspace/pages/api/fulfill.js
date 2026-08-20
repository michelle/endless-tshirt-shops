import Stripe from "stripe";
import sharp from "sharp";
const products={fitted:"bella-ladies-favorite-t-shirt",unisex:"next-level-fitted-crew"};
const sizes={S:"sml",M:"med",L:"lrg",XL:"xlg"};
async function sp(path, body) { const response=await fetch(`https://api.scalablepress.com/v2/${path}`,{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`:${process.env.SP_AUTH}`).toString("base64")}`,"content-type":"application/json"},body:JSON.stringify(body)}); const data=await response.json().catch(()=>({})); if(!response.ok || data.statusCode>=300) throw new Error(data.message || `Fulfillment ${path} request failed.`); return data; }
async function createDesign(timestamp) {
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="300" viewBox="0 0 1200 300"><rect width="100%" height="100%" fill="transparent"/><text x="600" y="170" fill="white" font-family="Arial,sans-serif" font-size="92" text-anchor="middle">${timestamp}</text></svg>`;
  const png=await sharp(Buffer.from(svg)).png().toBuffer();
  const form=new FormData();
  form.append("type","dtg");
  form.append("sides[front][artwork]",new Blob([png],{type:"image/png"}),"datetime.png");
  form.append("sides[front][dimensions][width]","8");
  form.append("sides[front][position][horizontal]","C");
  form.append("sides[front][position][offset][top]","3");
  const response=await fetch("https://api.scalablepress.com/v2/design",{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`:${process.env.SP_AUTH}`).toString("base64")}`},body:form});
  const data=await response.json().catch(()=>({}));
  if(!response.ok || data.statusCode>=300 || !data.designId) throw new Error(data.message || "Fulfillment design request failed.");
  return data;
}
export default async function handler(req,res) { if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"}); if(!process.env.STRIPE_SECRET_KEY||!process.env.SP_AUTH) return res.status(503).json({error:"Fulfillment is not configured yet."});
  try { const stripe=new Stripe(process.env.STRIPE_SECRET_KEY); const session=await stripe.checkout.sessions.retrieve(req.body?.sessionId); if(session.payment_status!=="paid") return res.status(409).json({error:"Payment has not completed."}); if(session.metadata?.fulfillment_status==="submitted") return res.status(200).json({orderId:session.metadata.scalable_press_order_id||null,alreadySubmitted:true}); const {cut,size,timestamp}=session.metadata||{}; const addr=session.shipping_details?.address; if(!products[cut]||!sizes[size]||!addr) return res.status(400).json({error:"This order is missing fulfillment details."});
    const design=await createDesign(timestamp);
    const quote=await sp("quote",{type:"dtg",products:[{id:products[cut],color:"Black",quantity:1,size:sizes[size]}],designId:design.designId,address:{name:session.shipping_details.name,address1:addr.line1,address2:addr.line2||"",city:addr.city,state:addr.state,zip:addr.postal_code,country:addr.country}});
    if(!quote.orderToken) throw new Error("Fulfillment quote did not return an order token."); const order=await sp("order",{orderToken:quote.orderToken}); if(!order.orderId) throw new Error("Fulfillment provider did not return an order ID."); await stripe.checkout.sessions.update(session.id,{metadata:{...session.metadata,fulfillment_status:"submitted",scalable_press_order_id:order.orderId}}); return res.status(200).json({orderId:order.orderId});
  } catch(e) { console.error("Fulfillment error",e); return res.status(502).json({error:e.message||"We could not submit fulfillment."}); }
}
