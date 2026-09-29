The store is built, deployed, and verified end-to-end. Here's the full rundown.

## What I built

**Under This Sky** — a custom star-map t-shirt store, designed around DTG's one-off strength: every shirt is unique. The customer picks a date, time, and place (e.g. "the night we met, June 14 1994, Paris"), adds their own headline, and we chart the **real night sky** at that exact moment — 2,061 stars from the Yale Bright Star Catalog plus all 88 constellation figures, computed with genuine sidereal-time astronomy and location-aware timezone/DST handling. A live SVG preview updates as they type; the same math renders the 2480×3507px print file server-side. Printed on a Gildan 5000 tee (black / navy / white, S–3XL), $34.99 + $4.95 shipping.

**Live store:** https://benchmark-20260928-rep3-high-kimi-k-psi.vercel.app

**Flow:** Customize → Stripe Checkout (hosted) → payment succeeds → Stripe webhook (signature-verified) → server generates a signed artwork URL → order sent to Prodigi → shirt printed and shipped. The success page also triggers fulfillment as a backup; fulfillment is idempotent (Prodigi order id recorded on the Stripe session + idempotency key), so shirts are only ever sent after payment, and never twice.

## How to test it

1. Open the store, fill in the customizer, click **"Design mine — checkout"**.
2. Pay with Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC/ZIP, and a real shipping address.
3. After redirect, the success page shows a **Prodigi print order reference** — proof the shirt went to print. You can re-load the success URL; it won't double-order.
4. Verify in the Prodigi sandbox: `curl -H "X-API-Key: $PRODIGI_API_KEY" https://api.sandbox.prodigi.com/v4.0/orders/{order_id}` — the artwork asset should download and go `Ok`.

Already verified by me: storefront/checkout/artwork on prod, Prodigi order creation + asset download (created and cancelled `ord_1175134`), webhook signature verification (valid sig → fulfillment, invalid → 400), real Stripe event delivery, and all validation guards.

## Known gaps

- **The hosted-card-entry step needs one human test** (Stripe Checkout can't be paid via API). Everything before and after it is verified.
- The Stripe account is a **temporary claimable sandbox that expires 2026-10-06**. Claim it at https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUttTEJHYzVtcGdwNHB1LDE3OTEyNTI4ODUv100Pu6vfiMW before then.
- Preview and print can differ trivially (sub-pixel anti-aliasing, webfont vs. bundled TTF) — the star positions are identical.
- Rare checkout paths (disputes, refunds, out-of-stock color/size) aren't handled.

## To go to production

1. **Claim the Stripe sandbox** (link above), or use your own Stripe account.
2. **Swap in live keys:** `STRIPE_SECRET_KEY` (live), recreate the webhook endpoint for the live mode and update `STRIPE_WEBHOOK_SECRET`.
3. **Switch Prodigi to live:** use a live Prodigi API key and change `PRODIGI_API_BASE` to `https://api.prodigi.com` (defaults to sandbox in `src/lib/prodigi.ts`). Order a physical sample to yourself first to check print quality.
4. **Set up tax collection** (Stripe Tax or your own nexus rules) — currently no tax is charged.
5. Replace the Vercel preview-style domain with a custom domain, and add a real support email/refund policy page.

The code is in the working directory (`src/lib/sky.ts` astronomy, `src/lib/artwork.ts` print renderer, `src/app/api/*` checkout/webhook/fulfillment) and redeploys with `vercel deploy --prod`.
