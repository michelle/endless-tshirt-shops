# Celestia — Custom Astronomical Star Map T-Shirts

A fully functional, production-ready custom apparel storefront leveraging Direct-to-Garment (DTG) print technology to create 1-of-1 personalized t-shirts.

## Concept
Every shirt captures the authentic astronomical night sky from the exact minute, date, and geographic location of a life-defining moment (an anniversary, birth, proposal, or milestone). 

Because each shirt is printed via DTG (Direct-to-Garment), there are no screen setup fees or bulk minimums. The star positions (altitude & azimuth) are calculated mathematically from the Yale Bright Star Catalog and rendered to a native 4680 × 5790 px 300 DPI transparent print file for the Bella + Canvas 3001 Unisex Jersey Tee.

---

## Live Deployment
- **Storefront URL:** [https://homeless-easy-experienced-memorabilia.trycloudflare.com](https://homeless-easy-experienced-memorabilia.trycloudflare.com)
- **Health Check:** [https://homeless-easy-experienced-memorabilia.trycloudflare.com/api/health](https://homeless-easy-experienced-memorabilia.trycloudflare.com/api/health)
- **Sample 300 DPI Print File:** [https://homeless-easy-experienced-memorabilia.trycloudflare.com/art/e543e1f8-38a2-42c0-af3d-def8fefebcf3.png](https://homeless-easy-experienced-memorabilia.trycloudflare.com/art/e543e1f8-38a2-42c0-af3d-def8fefebcf3.png)

---

## Architecture & Integrations

1. **Astronomy Engine (`lib/astro.js`):**
   - Implements Julian Date, Greenwich Mean Sidereal Time (GMST), Local Sidereal Time (LST), and spherical coordinate transformations (Right Ascension/Declination → Altitude/Azimuth).
   - Projects 80+ curated Yale Bright Star catalog coordinates and constellation connection lines using stereographic equidistant projection.

2. **Render & DTG Print Specification (`lib/starmap.js`):**
   - Generates vector SVGs and rasterizes them with `@resvg/resvg-js` to 4680 × 5790 PNG at 300 DPI.
   - **True Garment Transparency:** The outer canvas is transparent so the garment fabric is the backdrop. Only the circular cosmic disc, horizon ring with compass points, star points with diffraction spikes, and custom dedication typography are printed.

3. **Payment Provider (Stripe):**
   - Supports hosted **Stripe Checkout Sessions** with automatic shipping address collection across 12 countries.
   - Supports direct test payments and Stripe Elements integration.
   - Webhook endpoint (`/webhook/stripe`) listens for `checkout.session.completed` and `payment_intent.succeeded` events with cryptographic signature verification.

4. **Fulfillment (Prodigi Print API v4):**
   - Orders are submitted to Prodigi **only after payment succeeds**.
   - SKU: `GLOBAL-TEE-BC-3001` (Bella + Canvas 3001 Unisex Tee).
   - Validated attributes: `color` (`black`, `navy blue`, `asphalt`, `dark heather grey`), `size` (`s`, `m`, `l`, `xl`, `2xl`).
   - Prodigi fetches the print-ready asset directly over HTTPS from `/art/:orderId.png`.
   - Strict idempotency prevents duplicate orders on webhook retries.

---

## How to Test

1. **Online Interactive Test:**
   - Open [https://homeless-easy-experienced-memorabilia.trycloudflare.com](https://homeless-easy-experienced-memorabilia.trycloudflare.com).
   - Choose a city or enter coordinates, select date & time, customize the dedication message.
   - Click "Order Custom Shirt with Stripe" to checkout via Stripe's hosted checkout using test cards (e.g. `4242 4242 4242 4242`).
   - Or click "⚡ One-Click Instant Sandbox Test" for immediate automated verification.
   - Upon completion, you are redirected to `/success` displaying the confirmed Prodigi Order ID.

2. **Automated End-to-End Suite:**
   ```bash
   node test-e2e.mjs
   ```
   This script performs an automated end-to-end cycle: health check → preview generation → Stripe test charge → Prodigi order creation → polling Prodigi sandbox until asset download status reaches `Complete`.

---

## Known Gaps & Next Steps for Production

1. **Stripe Credentials:** Currently running on a claimable Stripe test sandbox key. To accept real customer payments:
   - Provide a live Stripe secret key (`sk_live_...`) and register the live webhook endpoint.
   - Claim the sandbox or activate a production Stripe merchant account.
2. **Prodigi Live Credentials:** Running against `https://api.sandbox.prodigi.com/v4.0`. Switch to `https://api.prodigi.com/v4.0` with a live Prodigi API key when ready for physical manufacturing.
3. **Persistent Database:** Orders and session receipts are stored in `./data/orders.json`. For high-volume multi-instance production, migrate this to PostgreSQL or MongoDB.
4. **Geocoding API:** The prototype includes a curated database of 25 major world cities; integrate Google Places API or Mapbox Geocoding for universal address search.
5. **Custom Domain:** The site is currently tunneled via Cloudflare Quick Tunnel. Map a permanent domain name using a named Cloudflare Tunnel, Vercel, or AWS ECS/Render deployment.
