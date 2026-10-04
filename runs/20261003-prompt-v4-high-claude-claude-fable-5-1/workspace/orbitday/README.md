# Orbitday — the solar system, the day you arrived

A made-to-order t-shirt store. The customer picks a date; the site computes where
all eight planets were on that day (JPL orbital elements) plus the moon phase, lays
it out with their caption, and prints it with direct-to-garment ink on a
Bella+Canvas 3001 tee via the Prodigi Print API. Payment is Stripe Checkout.
A shirt is only sent to Prodigi after Stripe confirms the payment.

**Live (temporary) deployment:** https://temporary-swift-squall-16gsq00.vercel.app

## How it works

```
/design  ──▶ POST /api/checkout ──▶ Stripe Checkout (hosted)
                                         │ payment succeeds
                                         ▼
          Stripe webhook ──▶ POST /api/stripe/webhook ──▶ fulfillCheckoutSession()
                                                              │  creates Prodigi order with
                                                              │  asset = /api/art/<token>.png
                                                              ▼
/thanks  ──▶ GET /api/orders/:session ──▶ status (also fulfils if the webhook is late)
```

* `src/lib/astro.ts` — planet heliocentric longitudes (JPL approximate elements, 1800–2050) and moon phase.
* `src/lib/render.ts` — one SVG renderer used by the browser preview **and** the print file, so what the customer sees is what the lab receives. Text is converted to paths with opentype.js (font embedded), so no fonts are needed at raster time.
* `src/app/api/art/[token]/route.ts` — rasterises the SVG with resvg (WASM) to the exact Prodigi front print area, **4680 × 5790 px at 300 DPI**, transparent background, pHYs chunk set to 300 DPI. Prodigi downloads the file from this URL.
* `src/lib/fulfill.ts` — idempotent Stripe → Prodigi handoff. The Prodigi order id is written back onto the Stripe PaymentIntent metadata; the Prodigi order carries `idempotencyKey = session id`, so a webhook/thank-you-page race cannot create duplicates (verified: the race produced one order and an `AlreadyExists` response).
* State lives in Stripe (sessions + PaymentIntent metadata) and Prodigi. No database.

DTG-specific choices: minimum stroke ≈ 1.2 mm, minimum dot ≈ 2.4 mm, solid ink only (no opacity/gradients), white ink on dark garments and charcoal on light ones, transparent PNG, design kept to ~11" wide on the chest.

## Test it

1. Open the live URL, click **Design yours**, change the date/caption/colours; the preview updates live. Toggle **Print file** to see the exact artwork that goes to the printer.
2. Click **Checkout**. On Stripe's page use card `4242 4242 4242 4242`, any future expiry, any CVC, any address. (Use `4000 0000 0000 9995` to see a declined card.)
3. You land on `/thanks`, which shows the Stripe payment, the Prodigi order id (`ord_…`) and the lab's progress, polled live.
4. Verify in Stripe: `stripe checkout sessions retrieve <cs_…> --expand payment_intent` → `payment_intent.metadata.prodigi_order_id`.
5. Verify in Prodigi sandbox: `curl -H "X-API-Key: $PRODIGI_API_KEY" https://api.sandbox.prodigi.com/v4.0/orders/<ord_…>`.
6. `GET /api/health` runs a self-check (env, wasm, fonts, test render).
7. `GET /api/art/<token>.png` returns the print file (`?w=800&bg=1` for a preview on the shirt colour).

Automated: `node scripts/pay-test-checkout.js "<checkout url>"` drives the hosted Checkout page with the test card in headless Chrome (needs `playwright-core` and Chrome installed). `npx tsx scripts/render-samples.ts` renders sample print files to `tmp/`.

## Run locally

```bash
cp .env.example .env.local   # fill in keys
npm install
npm run dev                  # http://localhost:3000
# forward webhooks locally (prints a whsec_… to put in STRIPE_WEBHOOK_SECRET):
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Note: Prodigi must be able to download the print file, so with a localhost URL the order is created but the asset download fails. Use a tunnel or the deployed URL for full end-to-end tests.

## Environment variables

| Name | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the webhook endpoint pointing at `/api/stripe/webhook` |
| `PRODIGI_API_KEY` | Prodigi API key (sandbox or live) |
| `PRODIGI_API_BASE` | `https://api.sandbox.prodigi.com/v4.0` or `https://api.prodigi.com/v4.0` |
| `SITE_URL` | Optional. Forces the public base URL used in Stripe redirects and Prodigi asset URLs (otherwise derived from the request host) |

## Known gaps

* **Temporary hosting.** The deployment is an unclaimed anonymous Vercel deployment and the Stripe account is an unclaimed sandbox; both must be claimed (links in the handoff message) or they expire.
* **Sandbox only.** Prodigi sandbox orders never progress past `InProgress`, so the "artwork received / in production / shipped" steps only move with a live key. The asset URL was verified reachable and correct, but the sandbox never actually downloads it.
* **No order emails from us.** Stripe sends the receipt (enable it in Stripe settings); there is no shipping-confirmation email yet (Prodigi has order-status callbacks that could drive one).
* **Flat-rate shipping and no tax.** $5.95 worldwide; Stripe Tax is not enabled. Prodigi's real shipping cost varies by country (about $3–8 for a tee).
* **No admin view.** Orders are visible in the Stripe dashboard (PaymentIntent metadata holds the Prodigi order id) and the Prodigi dashboard.
* **No rate limiting** on the render endpoint; it is cheap (~0.7 s warm, cached immutably by the CDN) but public.
* **Caption characters** are limited to the embedded Latin subset of Space Grotesk; unsupported characters are dropped silently by opentype.js.
* The shirt mockup is schematic (not a photo), by design.

## Going to production

1. **Claim the Vercel deployment** (or create a Vercel project and `vercel link`), attach a domain, set `SITE_URL`.
2. **Claim the Stripe sandbox**, then create a live Stripe account/keys. Activate the account (business details, bank). Enable email receipts and Stripe Tax if required.
3. **Create a live webhook endpoint** for `https://<domain>/api/stripe/webhook` with events `checkout.session.completed` and `checkout.session.async_payment_succeeded`; set `STRIPE_WEBHOOK_SECRET` to its secret.
4. **Prodigi live account**: get a live API key, add a payment method, set `PRODIGI_API_BASE=https://api.prodigi.com/v4.0`. Order one sample of each colour to check ink opacity and placement before launch.
5. Set env vars in Vercel (production), redeploy, run one real order with a live card and refund it.
6. Decide on **pricing/shipping**: current cost is about $11.89 per tee + $3–8 shipping; price is $36 + $5.95. Consider country-specific shipping rates via Stripe shipping options.
7. Add **Prodigi order callbacks** (`callbackUrl` on order creation) to send shipping emails with tracking, and a simple admin page.
8. Legal: returns/refund policy, privacy policy, terms; Stripe statement descriptor; business address in the footer.
9. Optional hardening: rate-limit `/api/art`, restrict `/api/orders/:id` to the buyer (e.g. require the Stripe customer email), add monitoring/alerting on webhook 5xx (Stripe retries for 3 days).
