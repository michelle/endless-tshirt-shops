The store is built, deployed, and verified end to end except for live payment, which is blocked on Stripe credentials that were not available in this environment.

**Live store:** https://benchmark-20260907-prompt-v3-high-c-nine.vercel.app
Source: `bloomprint/` in the workspace (`README.md` documents the architecture).

## The concept: Bloomprint

Each shirt is a one-of-one botanical specimen "grown" from the customer's name, an optional meaningful date, and a climate. A deterministic generator grows a plant (stem, branches, leaves, flowers, roots), gives it a Latin binomial derived from the name (Michelle becomes *Michellia amabilis var. MCMXCIV*), and draws it as a vintage herbarium plate with a specimen number, collection date, and optional dedication. The same code runs in the browser for the live preview and on the server for the print file, so what the customer sees is exactly what prints. This only makes sense with DTG: every shirt is a different full-colour design, printed once.

## What's in place

- **Design studio** at `/design` with live shirt and plate previews, five climates, eleven garment colours (dark shirts switch to pale ink), sizes XS to 3XL, and a "grow another" re-roll.
- **Stripe Checkout** (hosted): collects shipping address and phone, $39 with shipping included, and passes the design in session metadata.
- **Fulfillment gate:** only a signature-verified `checkout.session.completed` event with `payment_status: paid` reaches Prodigi. Fulfillment is idempotent (Prodigi idempotency key plus the order id stored on the PaymentIntent). The order page also fulfills as a fallback if the webhook is late, still gated on Stripe reporting "paid".
- **Print asset:** Prodigi downloads an HMAC-signed URL that renders the plate at 4680×5790 px (the Bella+Canvas 3001 front print area). Verified: a sandbox order created against the deployment reached asset status Complete.
- **Order page** at `/order/{session}` shows the design, address, payment, and live Prodigi stage and tracking.

## How to test

Stripe keys are the one missing piece. The run-specific Stripe CLI config was empty, so no test keys or webhook secret existed and I could not create them non-interactively. To enable checkout:

```bash
cd bloomprint
./scripts/configure-stripe.sh https://benchmark-20260907-prompt-v3-high-c-nine.vercel.app sk_test_...
```

That creates the webhook endpoint, stores both Stripe env vars on Vercel, and redeploys. Then open `/design`, grow a plant, pay with card 4242 4242 4242 4242, and watch the order page report the Prodigi sandbox order id and stage. You can also browse the deployed site now; the checkout button is deliberately disabled with a visible notice until keys exist.

Already verified without Stripe: pages render on Vercel, print route renders and rejects tampered tokens, checkout input validation, webhook signature rejection and unpaid deferral (local test in `scripts/webhook-test.mjs`), and a real Prodigi sandbox order with the deployed asset (`scripts/prodigi-sandbox-order.ts`).

## Known gaps

- No end-to-end paid test has run, for the reason above.
- No tax collection. Stripe Tax is not configured.
- Order records live in Stripe metadata only. There is no admin view, no order email beyond Stripe's receipt, and no shipment-tracking notification.
- Prodigi is on sandbox and the asset URL depends on the Vercel domain. Changing domains requires redeploying so old asset links stay valid via `NEXT_PUBLIC_SITE_URL`.
- The landing page inlines four SVG plates (~900 KB uncompressed HTML). Fine with Vercel compression, but worth caching as images later.

## To go to production

1. Run the Stripe setup script with a live key and confirm the webhook shows deliveries in the Stripe dashboard.
2. Set `PRODIGI_API_BASE` to the live endpoint with a live Prodigi key. Orders then cost money.
3. Decide on tax handling and review pricing and shipping countries in `src/lib/catalog.ts`.
4. Order one physical sample to check print scale and colour on light and dark garments.
5. Add a custom domain and set `NEXT_PUBLIC_SITE_URL`; optionally add Prodigi callbacks for tracking emails.
