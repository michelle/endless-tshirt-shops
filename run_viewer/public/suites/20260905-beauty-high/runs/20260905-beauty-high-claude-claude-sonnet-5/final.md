Everything is built, deployed, and verified end-to-end. Here's the rundown:

## What's live

**https://benchmark-20260905-beauty-high-clau-two.vercel.app** (Vercel project: `benchmark-20260905-beauty-high-claude-claude-sonnet-5`)

A whimsical rebuild of datetime.store: one product — a t-shirt printed with the exact moment you check out, down to the millisecond — with 4 live-animated art themes (Midnight Terminal, Cotton Candy Sky, Starfield, Extra Edition newsprint), a real garment mockup, and fit/color/size/timezone/12h-24h controls, all ticking live on canvas.

**Stack:** Next.js 16 on Vercel, Stripe Checkout for payment, Prodigi Print API (sandbox) for fulfillment via a webhook, Vercel Blob for direct-from-browser artwork upload (no DB — order state lives in Stripe metadata).

## How to test it

1. Open the URL, pick a theme/fit/color/size, click **"✨ Freeze this moment & check out."**
2. On Stripe's hosted checkout, use test card `4242 4242 4242 4242`, any future expiry/CVC/ZIP, any shipping address.
3. You'll land on `/success`, which polls until it shows `✅ Sent to print — order ord_…` — confirming the webhook fired and Prodigi's sandbox accepted the real order (SKU, color, size, artwork, address all mapped correctly).

**Stripe sandbox is claimable, not permanent** (expires in ~7 days otherwise). Claim it here so it's yours: **https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUNMeWlFNzBGQlRIVXRLLDE3ODkyMzkwMjkv100qgX0oaZa** (created against analogmidnight@gmail.com). All keys are already wired into Vercel's env vars either way.

## What I verified before handing off (not just "should work")

- Real headless-browser run: zero console/page errors, canvas animates, all controls work, checkout click uploads artwork to Blob and redirects to a genuine Stripe Checkout session.
- Hand-signed a synthetic `checkout.session.completed` webhook event and confirmed via Prodigi's API that it created a real sandbox order with correct recipient/SKU/attributes/artwork.
- Did **not** click through Stripe's actual hosted card form myself — do that once (step 2 above) to see the whole thing fire from a genuine payment.

## Known gaps

- Shipping country allowlist is a curated subset, not exhaustively cross-checked against Prodigi's per-SKU `shipsTo` lists.
- No retry/alerting if Prodigi rejects an order — it's recorded on the Stripe PaymentIntent metadata and logged, but nothing pages a human.
- No admin/order-history view or database — by design for this scope, but a real store would want one.
- Shipping cost is baked into the flat $32 price rather than itemized per destination.

Full details are in `README.md` at the project root.
