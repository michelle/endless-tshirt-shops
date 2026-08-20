import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({error:'Stripe is not configured'});
  const {style='fitted', size='M', timestamp} = req.body || {};
  if (!['fitted','unisex'].includes(style) || !['S','M','L','XL'].includes(size) || typeof timestamp !== 'string') return res.status(400).json({error:'Please choose a valid shirt and size.'});
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const origin = req.headers.origin || `https://${req.headers.host}`;
  const session = await stripe.checkout.sessions.create({
    mode:'payment',
    line_items:[{price_data:{currency:'usd',unit_amount:2250,product_data:{name:'datetime.store shirt',description:`${style} / ${size} · printed timestamp ${timestamp}`}},quantity:1}],
    shipping_address_collection:{allowed_countries:['US','CA','GB','AU','NZ','DE','FR','JP']},
    customer_creation:'always',
    metadata:{style,size,timestamp},
    success_url:`${origin}/?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:`${origin}/?cancelled=1`,
  });
  res.json({url:session.url});
}
