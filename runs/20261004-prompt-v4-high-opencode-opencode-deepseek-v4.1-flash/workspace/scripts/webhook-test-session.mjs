// Creates a Stripe Checkout Session whose success_url is NOT the app, so only
// the webhook can fulfil it. Used to verify the Stripe -> Prodigi path alone.
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error("STRIPE_SECRET_KEY required");
const stripe = new Stripe(key, { typescript: true });

const design = {
  title: "Webhook Test",
  subtitle: "Only the webhook fulfils this",
  date: "1999-12-31",
  time: "23:59",
  tz: "UTC",
  place: "Greenwich, United Kingdom",
  lat: 51.4779,
  lng: -0.0015,
  palette: "starlight",
};

const session = await stripe.checkout.sessions.create({
  mode: "payment",
  payment_method_types: ["card"],
  line_items: [
    {
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: 3600,
        product_data: { name: "Webhook Test Tee" },
      },
    },
  ],
  shipping_address_collection: { allowed_countries: ["US", "GB"] },
  shipping_options: [
    {
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: "Standard shipping",
        fixed_amount: { amount: 600, currency: "usd" },
      },
    },
  ],
  metadata: {
    design: Buffer.from(JSON.stringify(design), "utf8").toString("base64url"),
    size: "m",
    color: "black",
    quantity: "1",
  },
  success_url: "https://example.com/thanks",
  cancel_url: "https://example.com/cancel",
});

console.log(JSON.stringify({ id: session.id, url: session.url }));
