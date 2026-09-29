const PRICE = 3400;
const SHIPPING = 595;
const COLORS = new Set(['black','navy blue','white','natural','army']);
const SIZES = new Set(['s','m','l','xl','2xl','3xl']);
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({error:'Use POST to start checkout.'});
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({error:'Online checkout is being set up. Add a Stripe secret key to activate orders.'});
  let input = req.body;
  if (typeof input === 'string') { try { input = JSON.parse(input); } catch { input = {}; } }
  const words = String(input?.words || '').trim().slice(0,32);
  const place = String(input?.place || '').trim().slice(0,36);
  const date = String(input?.date || '').slice(0,10);
  const lat = Number(input?.lat), lon = Number(input?.lon);
  const color = COLORS.has(input?.color) ? input.color : 'black';
  const size = SIZES.has(input?.size) ? input.size : 'm';
  if (!words || !place || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(lat) || Math.abs(lat)>90 || !Number.isFinite(lon) || Math.abs(lon)>180) return res.status(400).json({error:'Please check the words, date, and coordinates.'});
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const base = `${protocol}://${host}`;
  const meta = {words,place,date,lat:lat.toFixed(4),lon:lon.toFixed(4),color,size,sku:'GLOBAL-TEE-BC-3001'};
  const form = new URLSearchParams();
  form.set('mode','payment');
  form.set('success_url',`${base}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url',`${base}/?checkout=cancelled#make`);
  form.set('billing_address_collection','auto');
  form.set('shipping_address_collection[allowed_countries][0]','US');
  form.set('phone_number_collection[enabled]','true');
  form.set('submit_type','auto');
  form.set('line_items[0][quantity]','1');
  form.set('line_items[0][price_data][currency]','usd');
  form.set('line_items[0][price_data][unit_amount]',String(PRICE));
  form.set('line_items[0][price_data][product_data][name]','Your Memory Constellation Tee');
  form.set('line_items[0][price_data][product_data][description]',`${words} · ${place} · Bella+Canvas 3001`);
  const artwork = `${base}/api/artwork?${new URLSearchParams(meta).toString()}`;
  form.set('line_items[0][price_data][product_data][images][0]',artwork);
  form.set('shipping_options[0][shipping_rate_data][type]','fixed_amount');
  form.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]',String(SHIPPING));
  form.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]','usd');
  form.set('shipping_options[0][shipping_rate_data][display_name]','Standard shipping');
  form.set('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]','business_day');
  form.set('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]','5');
  form.set('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]','business_day');
  form.set('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]','10');
  for (const [key,value] of Object.entries(meta)) form.set(`metadata[${key}]`,value);
  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`,'Content-Type':'application/x-www-form-urlencoded'},body:form.toString()});
    const data = await response.json();
    if (!response.ok) { console.error('Stripe Checkout session creation failed',data.error?.type,data.error?.code); return res.status(502).json({error:'We could not start checkout. Please try again shortly.'}); }
    return res.status(200).json({url:data.url});
  } catch (error) { console.error('Stripe request failed',error.message); return res.status(502).json({error:'We could not connect to secure checkout. Please try again.'}); }
};
