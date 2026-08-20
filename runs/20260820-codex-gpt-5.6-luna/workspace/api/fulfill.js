import Stripe from 'stripe';
import https from 'node:https';
import {Buffer} from 'node:buffer';

function post(path, body, auth, isForm=false) { return new Promise((resolve,reject)=>{ const boundary='----datetime'+Date.now(); const payload=isForm?Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\ndtg\r\n--${boundary}\r\nContent-Disposition: form-data; name="sides[front][artwork]"; filename="artwork.svg"\r\nContent-Type: image/svg+xml\r\n\r\n${body}\r\n--${boundary}\r\nContent-Disposition: form-data; name="sides[front][dimensions][width]"\r\n\r\n8\r\n--${boundary}\r\nContent-Disposition: form-data; name="sides[front][position][horizontal]"\r\n\r\nC\r\n--${boundary}\r\nContent-Disposition: form-data; name="sides[front][position][offset][top]"\r\n\r\n3\r\n--${boundary}--\r\n`):Buffer.from(JSON.stringify(body)); const opts={hostname:'api.scalablepress.com',path:`/v2/${path}`,method:'POST',headers:{Authorization:`Basic ${Buffer.from(`:${auth}`).toString('base64')}`,'content-type':isForm?`multipart/form-data; boundary=${boundary}`:'application/json','content-length':payload.length}}; const r=https.request(opts,x=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>{try{resolve({code:x.statusCode,body:JSON.parse(d)})}catch{resolve({code:x.statusCode,body:{message:d}})}})});r.on('error',reject);r.write(payload);r.end()}) }
function artwork(timestamp){ return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><rect width="1200" height="1200" fill="none"/><text x="600" y="600" fill="white" text-anchor="middle" font-family="monospace" font-size="68">${timestamp}</text></svg>` }
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  try { const {session_id}=req.body||{}; if(!session_id) return res.status(400).json({error:'Missing checkout session'}); const stripe=new Stripe(process.env.STRIPE_SECRET_KEY); const s=await stripe.checkout.sessions.retrieve(session_id); if(s.payment_status!=='paid') return res.status(402).json({error:'Payment has not completed'}); if(s.metadata?.sp_order_id) return res.json({order_id:s.metadata.sp_order_id,replayed:true});
    if(!process.env.SP_AUTH) return res.status(500).json({error:'Print partner is not configured'});
    const m=s.metadata||{}; const product=m.style==='fitted'?'bella-ladies-favorite-t-shirt':'next-level-fitted-crew'; const size={S:'sml',M:'med',L:'lrg',XL:'xlg'}[m.size]||'med';
    // Scalable Press test credentials are used for this request. The design is kept deterministic from the paid session.
    const design=await post('design',artwork(m.timestamp),process.env.SP_AUTH,true);
    if(design.code>=300||!design.body.designId) throw Error(design.body.message||'Design creation failed');
    const address=s.shipping_details?.address||{}; const quote=await post('quote',{type:'dtg',products:[{id:product,color:'Black',quantity:1,size}],designId:design.body.designId,address},process.env.SP_AUTH);
    if(quote.code>=300||!quote.body.orderToken||quote.body.orderIssues?.length) throw Error(quote.body.message||'Quote could not be created');
    const order=await post('order',{orderToken:quote.body.orderToken},process.env.SP_AUTH); if(order.code>=300||!order.body.orderId) throw Error(order.body.message||'Order could not be submitted'); await stripe.checkout.sessions.update(session_id,{metadata:{...m,sp_order_id:order.body.orderId}});
    res.json({order_id:order.body.orderId});
  } catch(e){ console.error(e); res.status(502).json({error:e.message||'Fulfillment failed'}); }
}
