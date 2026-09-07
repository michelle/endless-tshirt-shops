## Done — deployed and verified end-to-end

**Live site:** https://benchmark-20260906-minimal-inspecto-flax.vercel.app
**Vercel project:** `benchmark-20260906-minimal-inspector-high-claude-claude-sonnet-5`

### What it is
A rebuild of datetime.store's original concept: a t-shirt printed with the exact current millisecond timestamp. The mockup ticks live (real epoch ms) on the product page; clicking "Buy now" freezes that exact millisecond, and that's what gets printed. Style (Fitted/Unisex) + size (S/M/L/XL), $22.50, free shipping — same product decisions as the original.

### Stack
- **Next.js 16 / React 19**, Tailwind, deployed on Vercel
- **Stripe**: PaymentElement + AddressElement checkout, PaymentIntents, webhook-driven fulfillment
- **Prodigi Print API** (sandbox) replaces the original Scalable Press integration — real SKUs (`GLOBAL-TEE-GIL-64000` fitted, `GLOBAL-TEE-GIL-5000` unisex), real sandbox orders created and confirmed via direct API checks
- Artwork is rendered on-demand from the frozen timestamp via `/api/artwork` (next/og) — no file upload/storage needed; Prodigi fetches that URL directly
- No database: order/fulfillment state lives entirely in Stripe PaymentIntent metadata, updated by both a Stripe webhook (`payment_intent.succeeded` → places Prodigi order) and a Prodigi webhook (order stage changes → updates status)

### How to test it
Go to the live URL, pick a fit/size, click Buy, and pay with a Stripe test card: **4242 4242 4242 4242**, any future expiry, any CVC, any US address. You'll land on an order confirmation page that polls until the Prodigi sandbox order is placed (few seconds) and shows the order ID/stage. Test a decline with **4000 0000 0000 0002**.

I used my own Stripe **test/sandbox** account (provisioned via `stripe sandbox create`, no live keys involved) and the `PRODIGI_API_KEY` sandbox key you provided — no real charges or real print jobs are possible.

### Bugs I found and fixed while testing (worth knowing about)
1. A Stripe webhook redelivery race that could double-place a Prodigi order for one charge (the idempotency check was reading a stale event snapshot instead of live PaymentIntent state) — fixed and verified.
2. The Prodigi→our-webhook payload parsing had the order nested one level too shallow, so fulfillment-stage updates were silently no-op'd — fixed and verified live (confirmed a stage update flows through to the order status API).

### Known gaps / next steps
- **Stripe sandbox expires 2026-09-14** unless claimed: [redacted-private-link] — claim it if you want this to keep working past then, or swap in your own Stripe keys.
- Only **card payments** are enabled (no Apple/Google Pay) — those need a verified domain, which isn't practical on a `*.vercel.app` preview; enable after pointing a real domain at it.
- No persistent order database — fine at this scale, but the Stripe-metadata-as-datastore approach won't scale past a very small order volume or support things like admin order search.
- No emails are actually sent (Stripe's test-mode receipt emails don't send); the confirmation page is the only "receipt" today.
- I didn't wire up real transactional email, refunds/cancellation flow, or an admin view — happy to add any of those next if useful.
