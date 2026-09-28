const crypto=require('crypto');
const SIZE=new Set(['s','m','l','xl','2xl','3xl']);const COLOR=new Set(['black','navy blue','white','sand','dark heather grey']);
async function bodyBuffer(req){const chunks=[];for await(const c of req)chunks.push(Buffer.from(c));return Buffer.concat(chunks)}
function verify(raw,header,secret){const parts=Object.fromEntries(String(header||'').split(',').map(x=>x.split('=')));if(!parts.t||!parts.v1)return false;const signed=Buffer.from(`${parts.t}.${raw.toString('utf8')}`);const expected=crypto.createHmac('sha256',secret).update(signed).digest();try{return crypto.timingSafeEqual(expected,Buffer.from(parts.v1,'hex'))}catch{return false}}
async function webhook(req,res){
 if(req.method!=='POST')return res.status(405).end();if(!process.env.STRIPE_WEBHOOK_SECRET)return res.status(503).send('Webhook secret not configured');
 const raw=await bodyBuffer(req);if(!verify(raw,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET))return res.status(400).send('Invalid signature');
 try{const event=JSON.parse(raw.toString('utf8'));if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))return res.status(200).json({received:true});const s=event.data.object;if(s.payment_status!=='paid')return res.status(200).json({received:true,fulfilled:false});
  if(!process.env.PRODIGI_API_KEY)return res.status(500).send('Fulfillment is not configured');const m=s.metadata||{};if(m.product!=='GLOBAL-TEE-GIL-64000'||!SIZE.has(m.shirt_size)||!COLOR.has(m.shirt_color))return res.status(400).send('Invalid order metadata');
  const recipient=s.shipping_details||{};const address=recipient.address||{};const required=[recipient.name,address.line1,address.postal_code,address.country,address.city];if(required.some(x=>!x))return res.status(400).send('Missing shipping address');
  const u=new URL('https://'+req.headers.host+'/api/artwork');for(const [key,val] of Object.entries({place:m.design_place,dedication:m.design_note,lat:m.design_lat,lon:m.design_lon,date:m.design_date}))u.searchParams.set(key,val);
  const payload={merchantReference:s.id, idempotencyKey:`na-${s.id}`,shippingMethod:'Standard',recipient:{name:recipient.name,email:s.customer_details?.email||s.customer_email,address:{line1:address.line1,...(address.line2?{line2:address.line2}:{}),postalOrZipCode:address.postal_code,countryCode:address.country,townOrCity:address.city,...(address.state?{stateOrCounty:address.state}:{})}},items:[{merchantReference:'Night Atlas Coordinates Tee',sku:m.product,copies:1,sizing:'fitPrintArea',attributes:{color:m.shirt_color,size:m.shirt_size},assets:[{printArea:'front',url:u.toString()}]}],metadata:{stripeCheckoutSession:s.id,designPlace:m.design_place,designDate:m.design_date}};
  const p=await fetch('https://api.sandbox.prodigi.com/v4.0/Orders',{method:'POST',headers:{'X-API-Key':process.env.PRODIGI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!p.ok){const msg=await p.text();console.error('Prodigi order request failed',p.status,msg.slice(0,300));return res.status(502).send('Prodigi order submission failed');}return res.status(200).json({received:true,fulfilled:true});
 }catch(e){console.error('Webhook processing failed',e.message);return res.status(500).send('Webhook processing failed')}
}
webhook.config={api:{bodyParser:false}};
module.exports=webhook;
