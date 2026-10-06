Everything is verified and the workspace is clean. Here's the final report.

---

# Under Same Sky — build & deployment report

## What shipped

A working, deployed store: **Under Same Sky**, personalised star-map t-shirts.

**Live URL:** https://temporary-rapid-poplar-1vau346.vercel.app

The theme: the customer chooses a **date, time, place, caption, two names, shirt colour and size**, and the app computes the *real sky* over that place at that instant — actual stars from a bright-star catalogue, classic constellation lines, and the true moon phase — then prints it as a one-of-one DTG tee. It's a gift-buying theme (anniversaries, births, memorials, long-distance couples) that is fully customised per customer, which is exactly what DTG is good at.

**Product:** Bella + Canvas 3001 unisex tee, 9 colours, XS–4XL, printed front, $36 + $6 shipping. Artwork is rendered at the printer's full front-print resolution (**4,677 × 5,881 px, 300 DPI**, transparent background). The ink palette auto-switches (warm white + gold on dark shirts; navy + bronze on light shirts) so it reads on every colour.

## How to test it

1. Open **https://temporary-rapid-poplar-1vau346.vercel.app**.
2. In the designer, change the caption/names/date/time/place/colour/size — the preview updates live (it's the exact artwork that gets printed).
3. Click **Checkout securely**. Stripe's hosted checkout opens with shipping collection.
4. Pay with the Stripe test card:
   - Card `4242 4242 4242 4242`, any future expiry (e.g. `12/34`), any CVC, a fictional US address.
   - Declined-payment card: `4000 0000 0000 0002`.
5. The success page verifies the payment and shows the **Prodigi order ID**.
6. Confirm it reached Prodigi (sandbox):
   ```sh
   curl -s -H "X-API-Key: $PRODIGI_API_KEY" \
     https://api.sandbox.prodigi.com/v4.0/orders/ord_1177959
   ```
   You'll see `GLOBAL-TEE-BC-3001`, `{"color":"black","size":"m"}`, print area `front`, and the design URL.

> **Deployment note:** this is an unauthenticated Vercel "temporary" deployment, so it **expires 2026-10-06 04:37 UTC** (60 min). Claim it to keep it: https://vercel.com/claim-deployment?code=5177fccf-b1b5-4f9d-a33a-6297ada1034c . The source in `app/` is a standard Vercel project — `vercel deploy` reproduces it.

## Payment gate (the key requirement)

Payment is **Stripe Checkout** (hosted, test mode). The order is submitted to Prodigi *only* after the server independently re-retrieves the session from Stripe and verifies `payment_status === "paid"`, `mode === "payment"`, `currency === "usd"`, and that the total matches the quoted amount. Two independent triggers run the same verified path:

- the success-page poll (`GET /api/order?session_id=…`), and
- a **signature-verified Stripe webhook** (`POST /api/webhook`), so a paid order still prints if the customer closes the tab.

Fulfilment is idempotent: the Stripe session ID is used as Prodigi's `idempotencyKey`, so retries/duplicate webhooks return `AlreadyExists` and never print twice. The design URL is HMAC-signed and can't be guessed or tampered with.

**What I verified end-to-end:** a real Stripe test payment succeeded, the server created Prodigi order `ord_1177959` with the correct variant and artwork URL, Prodigi **downloaded the artwork** (`asset status: Complete` on an earlier order), and the success page rendered the order. An unpaid/abandoned session returned `unpaid` and created **no** Prodigi order.

## Known gaps

- **The URL is temporary (60 min)** — see the claim link above. The evaluator/you can also redeploy the source for a persistent URL.
- **No order database.** Lookup is by Stripe session ID (via the success URL) + Prodigi idempotency; there's no customer-facing "my orders" or admin view.
- **No customer email** (confirmation/receipt) and no shipment-tracking sync.
- **Flat shipping ($6) and no tax calculation.** Prodigi's quote endpoint returned `NotAvailable` for this sandbox account, so I priced from a known sandbox quote rather than live rates. Production should use Prodigi Quotes per destination and Stripe Tax.
- **The preview endpoint is unauthenticated** (capped at 1100 px) — fine for a demo, should be rate-limited for production.
- **Sandbox caveats:** Stripe test mode takes no real money; Prodigi's sandbox does not print or charge. No physical sample has been checked.
- **Star data** is the HYG/d3-celestial catalogue; the map is astronomically computed but decorative, not a certified navigational chart. Time is interpreted using the timezone of the chosen place.

## Next steps to production

1. **Stripe:** switch to a live secret key, register a live webhook endpoint for `checkout.session.completed` + `checkout.session.async_payment_succeeded`, set `STRIPE_WEBHOOK_SECRET`, and add a real success/receipt email.
2. **Prodigi:** swap in a live key and `PRODIGI_API_BASE=https://api.prodigi.com/v4.0`. **Order a physical sample** to check colour, size, placement and print softness.
3. **Hosting:** deploy to a durable project (Vercel/Netlify/Cloudflare) under a custom domain, with the secrets set as project env vars (not CLI flags). Add the Stripe webhook URL for that domain.
4. **Commerce correctness:** calculate shipping from Prodigi Quotes and tax from Stripe Tax, then update the amount-verification check to validate the full breakdown. Write real policies (returns for made-to-order goods, privacy/data retention, support contact).
5. **Operations:** add a small database for orders, transactional email, tracking sync, refund/cancel handling, rate limiting, and monitoring/alerting. Consider a scheduled reconciliation job for paid-but-unfulfilled orders.
6. Only after all of the above: set both store and Prodigi to live mode. Never mix test payments with live printing.

The source is in `app/` (see `app/README.md` for architecture, env vars, and local dev).
