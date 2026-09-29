The store is complete, deployed, and verified end-to-end. Here's my completion report.

---

## Stellara — Custom Star Map T-Shirts

**Deployed at: https://benchmark-20260928-rep2-high-openco-azure.vercel.app**

### The concept

"Wear the night you'll never forget." Stellara sells one-of-a-kind **star map** t-shirts. A customer picks a date, a place, and the words they want to remember it by — and we render the *actual* night sky for that exact moment (real star positions computed from a Hipparcos catalog of 288 bright stars, plus constellation lines and the moon), printed on demand with DTG. Because every shirt is computed from a unique date/place/words, no two are alike — a genuine fit for direct-to-garment.

### How it works (the full loop)

1. **Customize** (`/customize`) — date, time, place (geocoded via OpenStreetMap Nominatim), title, names, message, shirt color, size, quantity, with a **live server-rendered preview**.
2. **Pay** — checkout is a **Stripe Checkout Session** (shipping address collected by Stripe).
3. **Print & ship** — only after Stripe confirms payment via the `checkout.session.completed` webhook (signature-verified) is an order sent to **Prodigi**, which prints the shirt and ships it. The print file is a 3300×4125 transparent PNG generated server-side (`@resvg/resvg-js`).

### Tech stack

Next.js 14 (App Router) on Vercel · Stripe (Checkout Sessions + webhooks) · Prodigi Print API (sandbox) · `@resvg/resvg-js` for SVG→PNG · Nominatim for geocoding.

### How to test it

1. Open the URL above and click **"Create your star map"**.
2. Pick a date/place/title/names, watch the live preview update, choose color/size, click **Checkout**.
3. On Stripe's hosted page, use the test card **`4242 4242 4242 4242`**, any future expiry, any CVC, any postal code.
4. You'll land on the success page. The webhook then creates a Prodigi order — I verified this end-to-end (orders `ord_1175146`/`ord_1175148` in the sandbox, with the design asset downloaded by Prodigi).

I also confirmed the webhook **rejects** forged/missing signatures (400), and that Prodigi order creation is **idempotent** (retries return `AlreadyExists` rather than duplicating).

### Gaps I know about

- **Stripe key is a restricted, claimable sandbox key** (`rkcs_test_…`) — it can create Checkout Sessions and webhook endpoints, but not much else, and it **expires in 7 days**.
- **Prodigi is in sandbox mode** — orders don't actually print/ship; `PRODIGI_LIVE=true` + a live key is required for real fulfillment.
- **No order persistence** — orders aren't stored in a database; the webhook fires Prodigi directly. No order history, no admin view.
- **No email notifications** to the customer (order confirmation / tracking).
- **Shipping & tax aren't charged at checkout** — the base price only; Prodigi bills shipping separately, and Stripe Tax isn't configured.
- **Geocoding uses free Nominatim** (1 req/s, no SLA) with a small built-in fallback for common cities.
- **No real domain** — it's on a `*.vercel.app` alias.

### What to do next to go to production

1. **Claim the Stripe sandbox** (or create a real Stripe account) and swap in a full secret key; set the webhook secret in the Vercel project.
2. **Switch Prodigi to live** (`PRODIGI_LIVE=true` + live API key) and verify SKU/color/size availability for real fulfillment.
3. **Add a database** (e.g. Postgres/Vercel KV) to persist orders and make the webhook idempotent at the app layer, not just Prodigi's.
4. **Add email notifications** (order confirmation + tracking via Prodigi callbacks).
5. **Configure shipping rates and tax** in Stripe, and surface real shipping cost at checkout.
6. **Swap geocoding** to a paid provider (Mapbox/Google) for reliability and rate limits.
7. **Attach a custom domain** and enable Stripe's live mode.

The full source is in the workspace (`src/`), with a `README.md` documenting the architecture and environment variables.
