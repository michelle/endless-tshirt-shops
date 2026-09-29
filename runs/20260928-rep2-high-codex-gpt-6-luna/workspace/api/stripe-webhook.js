const crypto = require('crypto');
const ALLOWED_COLORS = new Set(['black','navy blue','white','natural','army']);
const ALLOWED_SIZES = new Set(['s','m','l','xl','2xl','3xl']);
function readBody(req) { return new Promise((resolve,reject)=>{ const chunks=[]; req.on('data',c=>chunks.push(c)); req.on('end',()=>resolve(Buffer.concat(chunks))); req.on('error',reject); }); }
function safeEqualHex(a,b) { try { const aa=Buffer.from(a,'hex'),bb=Buffer.from(b,'hex'); return aa.length===bb.length && crypto.timingSafeEqual(aa,bb); } catch { return false; } }
function signatureOk(raw, header, secret) {
  const pieces=Object.fromEntries(String(header||'').split(',').map(x=>x.split('=')));
  const timestamp=pieces.t, signatures=String(header||'').split(',').filter(x=>x.startsWith('v1=')).map(x=>x.slice(3));
  if (!timestamp || !signatures.length || Math.abs(Date.now()/1000-Number(timestamp))>300) return false;
  const expected=crypto.createHmac('sha256',secret).update(`${timestamp}.`).update(raw).digest('hex');
  return signatures.some(s=>safeEqualHex(expected,s));
}
const handler = async (req,res) => {
  if (req.method!=='POST') return res.status(405).send('Method not allowed');
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.PRODIGI_API_KEY) return res.status(500).send('Webhook not configured');
  let raw; try { raw=await readBody(req); } catch { return res.status(400).send('Invalid payload'); }
  if (!signatureOk(raw,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET)) return res.status(400).send('Invalid signature');
  let event; try { event=JSON.parse(raw.toString('utf8')); } catch { return res.status(400).send('Invalid payload'); }
  if (!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)) return res.status(200).json({received:true});
  const session=event.data?.object;
  if (!session || session.mode!=='payment' || session.payment_status!=='paid') return res.status(200).json({received:true,ignored:'payment not completed'});
  const md=session.metadata||{};
  if (!md.words || !md.place || !md.date || !Number.isFinite(Number(md.lat)) || !Number.isFinite(Number(md.lon))) return res.status(400).send('Missing order details');
  const shipping=session.shipping_details;
  const addr=shipping?.address;
  if (!shipping?.name || !addr?.line1 || !addr?.postal_code || !addr?.city || addr?.country!=='US') return res.status(400).send('Missing shipping address');
  const size=ALLOWED_SIZES.has(md.size)?md.size:'m';
  const color=ALLOWED_COLORS.has(md.color)?md.color:'black';
  const host=req.headers['x-forwarded-host']||req.headers.host;
  const protocol=req.headers['x-forwarded-proto']||'https';
  const imageUrl=`${protocol}://${host}/api/artwork?${new URLSearchParams({words:md.words,place:md.place,date:md.date,lat:md.lat,lon:md.lon}).toString()}`;
  const payload={
    merchantReference:session.id,
    idempotencyKey:session.id,
    shippingMethod:'Standard',
    recipient:{name:shipping.name,email:session.customer_details?.email||session.customer_email||undefined,phoneNumber:session.customer_details?.phone||undefined,address:{line1:addr.line1,line2:addr.line2||undefined,postalOrZipCode:addr.postal_code,countryCode:'US',townOrCity:addr.city,stateOrCounty:addr.state||null}},
    items:[{sku:'GLOBAL-TEE-BC-3001',copies:1,sizing:'fitPrintArea',attributes:{size,color,style:'3001',brand:'Bella + Canvas',edge:'Crew neck',gender:'Unisex',paperType:'100% cotton'},recipientCost:{amount:'34.00',currency:'USD'},assets:[{printArea:'front',url:imageUrl}]}],
    metadata:{paymentProvider:'stripe',paymentSession:session.id,personalization:{words:md.words,place:md.place,date:md.date,latitude:md.lat,longitude:md.lon}}
  };
  try {
    const prodigiBase=(process.env.PRODIGI_API_BASE_URL||'https://api.sandbox.prodigi.com/v4.0').replace(/\/$/,'');
    const response=await fetch(`${prodigiBase}/Orders`,{method:'POST',headers:{'X-API-Key':process.env.PRODIGI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const body=await response.json().catch(()=>({}));
    if (!response.ok) { console.error('Prodigi order submission failed',response.status,body.statusText||body.outcome||''); return res.status(502).send('Fulfillment submission failed; Stripe will retry.'); }
    const outcome=String(body.outcome||'').toLowerCase();
    if (['created','onhold','alreadyexists','ok','createdwithissues'].includes(outcome) || body.order?.id) return res.status(200).json({received:true,prodigiOrderId:body.order?.id||null,outcome:body.outcome||'created'});
    console.error('Unexpected Prodigi response',body.outcome||'unknown');
    return res.status(502).send('Fulfillment submission failed; Stripe will retry.');
  } catch(error) { console.error('Prodigi request failed',error.message); return res.status(502).send('Fulfillment submission failed; Stripe will retry.'); }
};

handler.config = {api:{bodyParser:false}};
module.exports = handler;
