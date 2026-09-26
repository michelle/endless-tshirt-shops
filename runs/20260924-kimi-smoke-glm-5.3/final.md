**Skyborn is built, deployed, and verified.** 🌌

## What I shipped

**[https://benchmark-20260924-kimi-smoke-glm-5.vercel.app](https://benchmark-20260924-kimi-smoke-glm-5.vercel.app)** — *"Skyborn — one sky, one shirt."*

**The concept:** the *real* night sky above your moment, printed once, for one person. The customer picks a date, time, and place; the app computes the actual sky at that instant — 1,637 naked-eye stars sized by magnitude and tinted by spectral color, 88 constellations with lines and labels, the Milky Way band, visible planets (with glyphs), and the moon at its true phase — and prints it as a 300 DPI full-front DTG print with the customer's own words, on a Gildan 64000, $42–48 with US shipping included. Every shirt carries a № derived from the moment. Zero inventory, zero pre-design — exactly what DTG enables.

**The stack:** Next.js 14 on Vercel; one deterministic SVG generator runs in the browser (live preview) and in the serverless print endpoint (identical pixels, no database needed — the spec travels in Stripe metadata and HMAC-signed URLs). Payments: **Stripe Checkout** (test-mode sandbox provisioned via the CLI's no-login flow — **claim it before Oct 3, 2026**: the claim URL is in the report). Fulfillment: **Prodigi Print API v4** — the *only* path to Prodigi is a signature-verified `checkout.session.completed` webhook with `payment_status === "paid"`, idempotent on the Stripe session ID.

## How to test it

⚠️ The build machine's network sinkholes `*.vercel.app` (resolves to Facebook/Dropbox IPs — same for all previous runs' URLs). Test from a normal network.

1. Open the site → pick a moment, words, and shirt — the live preview is pixel-identical to the print.
2. **Continue to payment** → pay with `4242 4242 4242 4242`, any future expiry/CVC, any US address.
3. The success page polls live: payment → "Sent to production" with the Prodigi order ID → per-stage status → tracking.

**What I already verified:** a real paid session end-to-end locally (Prodigi order `ord_1174437`), webhook-retry idempotency (same order returned, no doubles), and the deployed production webhook → **Prodigi order `ord_1174438` with `downloadAssets: Complete`** — Prodigi successfully downloaded the 300 DPI artwork from my stateless `/api/print` endpoint. Moon-phase geometry checked for waxing/waning crescent and gibbous; the default 1990 New York sky renders the correct summer constellations, Saturn, and a 1%-lit moon.

## Known gaps → production

**Gaps:** US-only flat shipping (no international quotes), no tax collection, **no content moderation** on custom text before print, no order database (Stripe + Prodigi are source of truth), no branded packing inserts or Prodigi callbacks, policies/support flows unwritten.

**Next steps:** claim the Stripe sandbox (or create a real account) → live keys + live webhook endpoint; flip `PRODIGI_API_BASE_URL` to Prodigi live + live key and **order a physical sample** to check print scale; add a moderation queue (Prodigi supports pause windows), Prodigi callbacks → transactional email, Stripe Tax, and international quotes. Full runbook in the app's `README.md`.
