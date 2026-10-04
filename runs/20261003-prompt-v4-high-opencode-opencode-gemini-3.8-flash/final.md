### Store Overview & Concept

**AETHEL CELESTIAL** (`https://temporary-zippy-sequoia-1wu65gs.vercel.app`) is a custom t-shirt store engineered around **Bespoke Chrono-Cartography**: wearable 1-of-1 astronomical star charts.

#### Taking Full Advantage of Direct-to-Garment (DTG) Technology
Traditional screen printing requires burning separate screens for each color and charges hefty setup fees, making true 1-of-1 personalized tees economically impossible. **Direct-to-Garment (DTG)** prints ink directly into cotton fibers with no screen setup fees and no color limits. 

We take full advantage of DTG by letting every customer immortalize life’s most profound moment (the night they met, a child’s birth, an anniversary, or a major life achievement):
1. **Scientific Astronomical Calculation**: Enter any city on Earth and exact date & time. Our engine calculates Greenwich Mean Sidereal Time (GMST), Local Sidereal Time (LST), and equatorial-to-horizontal coordinates (RA/Dec $\to$ Alt/Az) to project the exact stars and constellations visible above the horizon at that second.
2. **True Lunar Phase Calculation**: Computes the exact synodic lunar age, phase name, and illumination percentage.
3. **Personal Inscriptions & Coordinates**: Formats latitude/longitude to the arcsecond, milestone headline, and personal dedication message in serif typography.
4. **Archival DTG Canvas**: Rendered on demand to the exact **4,677 × 5,881 px (300 DPI)** print area for **Bella + Canvas 3001** unisex ringspun cotton tees, with transparent backgrounds so only the starlight artwork penetrates the fabric.

---

### Deployment & Live URLs

* **Live Storefront URL**: [https://temporary-zippy-sequoia-1wu65gs.vercel.app](https://temporary-zippy-sequoia-1wu65gs.vercel.app)
* **Vercel Claim Link**: [Claim Deployment to Your Account](https://vercel.com/claim-deployment?code=b9818223-3c5a-470c-8fc7-d017abf1952b) *(allows claiming the deployment directly into your permanent Vercel team so it never expires)*
* **Sample Print Asset (4,677 × 5,881 px PNG)**: [Inspect Sample DTG Print File](https://temporary-zippy-sequoia-1wu65gs.vercel.app/api/design/sample.png)
* **Live Prodigi Order Status Tracker**: [Track Order ord_1176991](https://temporary-zippy-sequoia-1wu65gs.vercel.app/order/ord_1176991)

---

### Integrations Built

1. **Payment Provider (Stripe)**:
   * Uses Stripe Checkout (`mode: 'payment'`) with automated shipping address collection across 20+ countries.
   * **Strict Fulfillment Gate**: Shirts are **only** sent to Prodigi after Stripe verifies payment status (`payment_status === 'paid'` or `payment_intent.status === 'succeeded'`). Unpaid sessions are rejected.
   * Supports both Stripe Hosted Checkout and Stripe Webhooks (`/api/webhooks/stripe` listening to `checkout.session.completed`), as well as client-side return verification (`/api/order/verify`).
   * Test Stripe sandbox keys provisioned and configured:
     * Publishable Key: `REDACTED_BUILD_PLACEHOLDER`
     * Secret Key: Configured in deployment environment.

2. **Print & Fulfillment Provider (Prodigi Print API v4.0)**:
   * Integrated with `https://api.sandbox.prodigi.com/v4.0/orders`.
   * SKU: `GLOBAL-TEE-BC-3001` (Bella + Canvas 3001 Unisex Jersey Tee).
   * Supported Garment Colors: `black` (Obsidian), `navy blue` (Midnight Navy), `white` (Pure Alabaster), and `natural` (Vintage Unbleached).
   * Sizes: `xs`, `s`, `m`, `l`, `xl`, `2xl`.
   * Standard Worldwide Shipping with tracking assigned.

3. **High-Resolution Vector-to-Raster Engine**:
   * Generates custom SVG on demand and compiles it to a full **4,677 × 5,881 px 32-bit transparent PNG** in serverless execution via `@resvg/resvg-wasm`.
   * Prodigi's asset pipeline successfully downloads, computes the MD5 hash, prepares print-ready RIP assets, and advances orders into `inProduction`.

---

### How to Test the Integration

#### Method 1: Interactive Storefront Checkout (Hosted Stripe Flow)
1. Open the live store: [https://temporary-zippy-sequoia-1wu65gs.vercel.app](https://temporary-zippy-sequoia-1wu65gs.vercel.app).
2. Customize your shirt in the studio:
   * Select a city preset (or enter custom coordinates).
   * Pick any historic or future date & time.
   * Enter a custom milestone headline and personal dedication.
   * Choose garment color (e.g. Obsidian Black or Midnight Navy) and size.
   * Toggle between **Full Garment** and **Inspect Print** view on the live mockup.
3. Click **"Order Custom T-Shirt • $36.00"**.
4. You will be redirected to the secure Stripe Checkout page:
   * Enter any test email and shipping address.
   * Use Stripe test card `4242 4242 4242 4242`, any future expiration date (e.g., `12/28`), and CVC `123`.
5. Upon payment completion, you are redirected back to `/order-success?session_id=...`.
6. The page verifies the payment with Stripe, orders the shirt via Prodigi, renders celebratory confetti, and displays the **Prodigi Order ID**, live fulfillment stage, and link to the generated 4,677 × 5,881 px print file.

#### Method 2: Instant 1-Click Sandbox Evaluation (Evaluator Shortcut)
If you want to test the full payment $\to$ Prodigi pipeline without filling out card forms:
1. In the studio, click **"⚡ 1-Click Sandbox Test Order (Stripe + Prodigi)"**.
2. This creates and confirms a real Stripe test `PaymentIntent`, verifies success, triggers the Prodigi Print API, and renders the result card with:
   * **Stripe Payment ID** (e.g., `pi_...`)
   * **Prodigi Order ID** (e.g., `ord_...`)
   * Link to the live order tracking page.

#### Method 3: Live Order Status Lookup
* Click **"Track Order"** in the top navigation bar or navigate directly to `/order/[prodigiOrderId]` (for example, `/order/ord_1176991`).
* You can observe real-time details from Prodigi:
  * `downloadAssets: Complete`
  * `printReadyAssetsPrepared: Complete`
  * `allocateProductionLocation: Complete`
  * `inProduction: InProgress`
  * Carrier details (`Royal Mail DSA`, shipment ID, tracking link).

---

### Known Gaps & Constraints

1. **Ephemeral Order Storage**:
   * Orders are cached in serverless memory and `/tmp/aethel_orders.json`. While all design parameters are permanently embedded in self-contained Base64 asset URLs (`/api/design/d_...png`) so Prodigi can fetch them at any time, adding a persistent database (PostgreSQL, Supabase, or Redis) is recommended for long-term customer account history.
2. **Production Domain & Webhook Signing**:
   * The current deployment is hosted on a Vercel temporary domain. When moving to a custom domain (e.g., `store.example.com`), configure `STRIPE_WEBHOOK_SECRET` in Stripe Dashboard to enforce cryptographic signature verification on incoming webhooks.
3. **Sandbox Production Mode**:
   * The Prodigi API key is currently connected to Prodigi Sandbox (`api.sandbox.prodigi.com`), which simulates lab processing and tracking without charging real production costs.
4. **Custom Font Embedding in Exported PNGs**:
   * Text in the generated PNG uses standard web-safe vector serif fallbacks (Georgia / Trajan / Cormorant Garamond). For custom licensed brand typography, fonts can be preloaded into the WASM renderer via `resvg.loadFont()`.

---

### Next Steps to Bring It to Production

1. **Claim the Vercel Deployment & Add Custom Domain**:
   * Use the [Vercel Claim Link](https://vercel.com/claim-deployment?code=b9818223-3c5a-470c-8fc7-d017abf1952b) to claim the deployment into your Vercel organization.
   * In Vercel Project Settings $\to$ Domains, attach your production domain (e.g., `shop.yourdomain.com`).
2. **Switch to Production Prodigi API**:
   * Sign up for a live production account at [prodigi.com](https://www.prodigi.com/).
   * Update the environment variable `PRODIGI_API_KEY` to your live key.
   * Update the base URL in `lib/prodigi.ts` from `api.sandbox.prodigi.com` to `api.prodigi.com`.
   * Add a payment method on your Prodigi dashboard to fund wholesale garment production costs.
3. **Switch to Live Stripe Keys**:
   * Activate your Stripe live account in the Stripe Dashboard.
   * Replace `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` with your live production keys (`sk_live_...` and `pk_live_...`).
   * Add your live endpoint `https://shop.yourdomain.com/api/webhooks/stripe` in the Stripe Dashboard and set `STRIPE_WEBHOOK_SECRET`.
4. **Persistent Database**:
   * Connect a managed database (Vercel Postgres, Supabase, or PlanetScale) with Prisma or Drizzle ORM to maintain order receipts, customer profiles, and analytics.
