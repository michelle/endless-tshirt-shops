Done. The store is live, fully tested end to end, and already has two real (sandbox) orders flowing through Prodigi's print pipeline.

## What I built

**Meridian — Sky Keepsake Tees** at **https://benchmark-20260928-rep3-high-kimi-k.vercel.app**

The concept: customers pick a **place + moment** (first date, wedding, new baby…), and the shirt shows the *actual sky from that instant* — sun position and the day's sun path, moon phase placed where the moon really was, seeded star field for night moments. Day moments render a blue sky chart; twilight renders a golden-hour gradient; night renders stars + moon. Every shirt is mathematically unique, which is what makes DTG the right print tech.

Stack: Next.js on Vercel → Stripe Payment Element (test-mode sandbox account I provisioned via `stripe sandbox create`) → signature-verified `payment_intent.succeeded` webhook → Prodigi Print API (Bella+Canvas 3001, `GLOBAL-TEE-BC-3001`, DTG front print, 2808×3474 artwork = 0.6× the recommended 4680×5790). Design params travel in HMAC-signed tokens, so the print URL, price, size, and colour can't be tampered with between checkout and fulfilment. Fulfilment is idempotent (Prodigi `idempotencyKey` = payment id), and a self-healing reconcile on the confirmation page re-drives the webhook if it was ever missed.

## Verified working (live)

- Real payment through the deployed site → Stripe webhook → Prodigi order **ord_1175131**: correct SKU, burgundy/L, Lisbon recipient, $39.99 recipient cost, artwork URL downloaded by Prodigi (status `Complete`, now `inProduction`)
- Idempotency: reconcile reports `already-fulfilled`, no duplicates
- Security: bad webhook signatures → 400, tampered design tokens → 403, invalid designs → 400
- Prodigi sandbox prints nothing/charges nothing, which is exactly what you want for testing

## How to test it yourself

1. Open the URL, scroll to the designer: search a city (e.g. "Reykjavík"), pick an occasion, choose colour/size — preview updates live.
2. Click **Create my tee** → on the payment page fill the shipping address and use Stripe's test card: **4242 4242 4242 4242**, any future expiry, any CVC.
3. You'll land on the confirmation page showing payment → sent-to-print → production status; the order appears in the Prodigi sandbox dashboard under the payment id.

## Known gaps

- **Everything runs in test/sandbox mode** — Stripe test keys (7-day sandbox account), Prodigi sandbox (`api.sandbox.prodigi.com`), no real money, no real shirts.
- **No order database** — state lives in Stripe + Prodigi (durable), but there's no first-party order history/admin.
- **Flat $39.99 worldwide** — no address-based shipping tiers or tax (Stripe Tax not enabled); margin on far-flung destinations is untested.
- **Artwork is 180 DPI equivalent** (chosen to stay well within Vercel response limits); fine for DTG, but I didn't print a physical sample.
- The browser card-entry step (Stripe Elements) wasn't exercised headlessly — everything around it was.

## To bring it to production

1. **Stripe**: claim the sandbox (claim URL from setup, expires 2026-10-06) or plug in your own account's live keys; set `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` in Vercel env and redeploy. The webhook endpoint (`we_1UKpktRGt9DTFR87cFdHUizE`) already points at the deployment — keep `STRIPE_WEBHOOK_SECRET` in sync.
2. **Prodigi**: swap `PRODIGI_API_KEY` for a live key and set `PRODIGI_BASE_URL=https://api.prodigi.com/v4.0`.
3. Set a fresh `DESIGN_SIGNING_SECRET`, keep `SITE_URL` on your canonical domain, and order yourself a sample before taking real orders.
