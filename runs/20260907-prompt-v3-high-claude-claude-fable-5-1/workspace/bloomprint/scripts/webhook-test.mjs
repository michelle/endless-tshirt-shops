import Stripe from "stripe";
const stripe = new Stripe("stripe_test_secret");
const secret = "stripe_webhook_secret";
async function send(label, payloadObj, sig) {
  const payload = JSON.stringify(payloadObj);
  const header = sig ?? stripe.webhooks.generateTestHeaderString({ payload, secret });
  const res = await fetch("http://localhost:3457/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": header, "content-type": "application/json" }, body: payload });
  console.log(label, res.status, (await res.text()).slice(0, 160));
}
const base = (over) => ({ id: "evt_test_1", object: "event", type: "checkout.session.completed", data: { object: { id: "cs_test_abc123", object: "checkout.session", payment_status: "unpaid", ...over } } });
await send("bad signature       ->", base({}), "t=1,v1=deadbeef");
await send("valid sig, unpaid   ->", base({ payment_status: "unpaid" }));
await send("valid sig, paid     ->", base({ payment_status: "paid" }));
await send("other event type    ->", { ...base({}), type: "payment_intent.created" });
