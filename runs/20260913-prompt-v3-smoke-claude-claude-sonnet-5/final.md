## Cipher Tees — built and deployed

**Live:** https://benchmark-20260913-prompt-v3-smoke-lime.vercel.app
(Vercel project: `benchmark-20260913-prompt-v3-smoke-claude-claude-sonnet-5`)

**The concept:** Every shirt is generated, not picked. The customer types a phrase — a name, a date, a lyric, up to 28 characters — and it deterministically drives a radial "cipher" pattern (84 bars, colors, lengths all derived from the exact text via a seeded hash). Same phrase always produces the same pattern, byte-for-byte; nobody else gets yours. That's a genuine fit for DTG: no setup cost, no minimums, a real reason every single print is a one-off. Customer picks a palette (6 options), shirt color (white/black/navy/sport grey), size (S–2XL), sees a live preview, and checks out.

**How it's wired:**
- **Stripe Checkout** (test-mode sandbox account I provisioned via `stripe sandbox create`, claim URL below) takes payment. Price is computed server-side, never trusted from the client.
- The **only** path that talks to Prodigi is the `checkout.session.completed` **webhook**, gated on a verified signature and `payment_status === "paid"`. The Prodigi order's idempotency key is the Checkout Session ID, so a retried webhook can't double-print.
- The print file is rendered server-side (satori + resvg) from the *same* component tree as the live browser preview, so what the customer sees is exactly what gets printed — I verified this by rendering both a black-shirt and white-shirt version and compositing them over their garment color.
- No database: Stripe holds the order data (Checkout Session/PaymentIntent metadata); `/order/success` and `/order/status` read it back and live-poll Prodigi for fulfillment/shipping status.
- I end-to-end tested this against the real sandboxes: created a real Checkout Session, posted a correctly-signed webhook event, confirmed Stripe accepted it, and confirmed Prodigi actually fetched the art PNG over the internet and marked the order `Ok`/`Complete` (order `ord_1171949`). Script is at `scripts/smoke-test.mjs` if you want to rerun it.

### How to test it
1. Visit the site → **Build a tee** → type a phrase, pick palette/color/size → **Add to cart**.
2. **Cart** → **Checkout with Stripe** → on Stripe's hosted page use test card `4242 4242 4242 4242`, any future expiry/CVC/ZIP, and a US (or other supported-country) shipping address.
3. You'll land on `/order/success` with your design preview; within a few seconds it'll show a Prodigi sandbox order ID and status. Save that page's URL (or the Checkout Session ID) — `/order/status` lets you look it up again later.

### Gaps / known limitations
- **Both API keys are sandbox/test.** The Stripe sandbox I created expires **2026‑09‑20** unless claimed: `stripe sandbox claim` or https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUZLWkVEUVFNckpDQ3JsLDE3ODk5Mzg5OTUv100JodfZ6ao — claim it (or swap in your own Stripe account's keys) before then. `PRODIGI_API_KEY` is the sandbox key you gave me; no real shirts get printed until you swap in a live Prodigi key.
- No transactional email — confirmation is the on-page success/status screen only. Turn on Stripe's automatic payment-receipt emails, or wire up a real email provider, before launch.
- No customer accounts/order history — order lookup is by Checkout Session ID only (shown on the success page). Fine for a small store; add a DB + auth if you need real order history.
- No ops alerting if a Prodigi fulfillment call fails after payment — it's surfaced on the customer's status page (`fulfillmentError`) and Stripe will retry the webhook, but nothing pages a human. Worth adding before real volume.
- `npm audit` flags several Next.js advisories; they're all for features this app doesn't use (custom servers, i18n, AVIF image optimization) — but worth upgrading Next periodically.
- Front print only, sizes S–2XL, 6 palettes/4 garment colors — all easy to extend (Prodigi's SKU also supports back/sleeve/neck-label prints and sizes up to 5XL).

### To go to production
1. Claim (or replace) the Stripe sandbox with your real Stripe account; flip to live keys; re-point the webhook endpoint at the same URL with live-mode signing secret.
2. Get a real Prodigi account + live API key (sandbox orders never actually print/ship).
3. Turn on Stripe email receipts and decide if you want a real transactional-email flow.
4. Point a custom domain at the Vercel project if you don't want the `.vercel.app` URL.
5. Consider basic rate-limiting on `/api/checkout` and `/api/art` before public launch.
