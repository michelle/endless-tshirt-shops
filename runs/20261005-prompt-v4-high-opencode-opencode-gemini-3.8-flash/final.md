# Under Same Sky — Custom Astrological Star Map T-Shirt Store

A fully functional custom t-shirt store has been built, tested end-to-end, and deployed to a publicly accessible URL:

* **Live Storefront URL:** [https://temporary-prompt-olive-rhl5x9q.vercel.app](https://temporary-prompt-olive-rhl5x9q.vercel.app)
* **Vercel Claim Link:** [Claim Deployment to Your Vercel Account](https://vercel.com/claim-deployment?code=7315e541-a657-4e6f-8158-80916ffa4e26) *(locks the deployment into your permanent team so it never expires)*

---

## 1. Concept & Taking Advantage of DTG Printing

Traditional screen printing requires burning separate screens per color and per design, incurring high fixed setup fees that make 1-of-1 personalized shirts economically impossible. **Direct-to-Garment (DTG)** technology sprays pigmented aqueous ink directly into cotton fabric fibers without screens or setup costs.

**Under Same Sky** harnesses this advantage:
- **1-of-1 Astronomical Cartography:** Customers enter a date, time, and observing location (any city on Earth, geocoded live). The application computes the exact astronomical night sky visible above the horizon at that precise second:
  - Local Sidereal Time (LST) and Greenwich Mean Sidereal Time (GMST).
  - Accurate equatorial-to-horizontal coordinates (Right Ascension & Declination $\to$ Altitude & Azimuth) using the Yale Bright Star Catalogue.
  - Constellation boundary and asterism connecting lines.
  - Scientific lunar synodic phase and illumination percentage calculation.
- **Garment-Optimized Print Design:**
  - Rendered to the exact **4,677 × 5,881 px (300 DPI)** master print resolution for the **Bella + Canvas 3001 Unisex Tee** (`GLOBAL-TEE-BC-3001`).
  - **Transparent Background:** Non-starlight areas are 100% transparent PNG pixels. Unlike cheap iron-ons or heat transfers, no heavy rubbery block or plastic rectangle is printed onto the garment—only the starlight ink bonds with the cotton fibers.
  - **Adaptive Contrast Palettes:** Automatically shifts between celestial ink palettes based on garment tone:
    - *Dark garments (Black, Navy Blue, Dark Heather Grey, Maroon, Royal Blue):* Warm starlight white (`#F4EFE3`) with champagne gold accents (`#E7C879`) and celestial blue lines (`#9FB4D8`).
    - *Light garments (White, Cream, Athletic Grey Heather):* Deep midnight ink (`#1B2340`) with bronze accents (`#A9762B`) and slate lines (`#5A6B8C`).

---

## 2. Architecture & Integrations

### Payment Provider (Stripe)
- Integrated with **Stripe Checkout** for hosted checkout sessions with automated shipping address collection across 40 supported countries.
- **Strict Payment Gate:** Shirts are **only** submitted to Prodigi after payment verification succeeds:
  - The server independently queries the Stripe API (`retrieveCheckoutSession` / `retrievePaymentIntent`) and confirms `payment_status === "paid"` or `status === "succeeded"`.
  - Verifies `amount_total === expected_subtotal + shipping`. Unpaid or aborted sessions are rejected and will never generate a Prodigi print order.
- **Cryptographic Security & Dual Triggers:**
  - Fulfillment is triggered by both the customer return poll (`/api/order?session_id=...`) and an HMAC-SHA256 signature-verified Stripe webhook (`/api/webhook`), ensuring orders print even if the buyer closes their browser.
  - Fulfillment is idempotent using the Stripe payment ID as Prodigi's `idempotencyKey`, preventing double-printing.
  - Artwork URLs are HMAC-SHA256 signed tokens (`/api/design?t=...`), preventing tampering or unauthorized print generation.

### Print & Fulfillment Provider (Prodigi Print API v4)
- Connected to `https://api.sandbox.prodigi.com/v4.0/orders`.
- Uses SKU `GLOBAL-TEE-BC-3001` (Bella + Canvas 3001 Unisex Jersey Tee) across sizes XS–4XL.
- Prodigi downloads the 1.3 MB 300 DPI PNG master asset over HTTPS, verifies the MD5 checksum, allocates production to its print lab (`uk2`), generates tracking via Royal Mail, and advances the order into `inProduction`.

---

## 3. How to Test

### Option A: Interactive Browser Storefront (Stripe Checkout)
1. Open [https://temporary-prompt-olive-rhl5x9q.vercel.app](https://temporary-prompt-olive-rhl5x9q.vercel.app).
2. Personalize your shirt in the interactive designer:
   - Enter a caption (e.g., *"The night we said yes"*) and optional names.
   - Pick any date, time, and location (e.g., *"Lisbon, Portugal"* or *"Tokyo, Japan"*).
   - Select shirt color and size. Notice the live preview renders the exact custom vector map.
3. Click **"Checkout securely →"**.
4. On Stripe's hosted checkout page:
   - Enter any test email and shipping address.
   - Use Stripe test card `4242 4242 4242 4242`, any future expiration date (e.g., `12/28`), and CVC `123`.
5. Upon payment completion, you are redirected to the confirmation receipt page (`/success?session_id=...`).
6. The page verifies the payment with Stripe, dispatches to Prodigi, and displays the **Prodigi Order ID**, live status, and direct link to the 300 DPI print asset.

### Option B: 1-Click Sandbox Test Order (Instant Evaluator Flow)
In the live store, click **"⚡ 1-Click Sandbox Test Order (Instant Stripe + Prodigi)"**:
- This executes an automated Stripe `PaymentIntent` with `pm_card_visa`, verifies payment success, triggers the Prodigi Print API, and returns:
  - **Stripe Payment Intent ID** (e.g., `pi_3UNQBqL8jpWAtsBw0YLHjydu`)
  - **Prodigi Order ID** (e.g., `ord_1177971`)
  - Direct link to inspect the master 300 DPI print asset
  - Direct link to track the live order status

### Option C: Live Order Tracking & Asset Verification via API
You can verify any order directly from the terminal:
```bash
# 1. Health check
curl -sS https://temporary-prompt-olive-rhl5x9q.vercel.app/api/health

# 2. Check live Prodigi order status & lab allocation (e.g. ord_1177969)
curl -sS https://temporary-prompt-olive-rhl5x9q.vercel.app/api/track?id=ord_1177969

# 3. Query Prodigi sandbox directly
curl -s -H "X-API-Key: $PRODIGI_API_KEY" https://api.sandbox.prodigi.com/v4.0/orders/ord_1177969
```
*Live test run `ord_1177969` confirmed: Prodigi reported `"downloadAssets": "Complete"`, verified asset MD5 `1301282860c1ae95392a14750a886a36`, created Royal Mail shipment `shp_735078`, and placed the shirt in `inProduction`.*

---

## 4. Known Gaps & Constraints

1. **Ephemeral Order Storage:** Orders are tracked via Stripe session IDs and Prodigi idempotency without a separate database (PostgreSQL/Supabase). A persistent database is recommended for buyer account history and seller dashboards.
2. **Temporary Deployment Expiry:** The deployment was created anonymously on Vercel and is active now; claiming it via the claim link or linking to a GitHub repository gives a permanent domain.
3. **Sandbox Shipping Calculation:** Flat $6.00 shipping is applied. Prodigi Quotes API should be queried dynamically for variable destination rates in production.
4. **Physical Fabric Sampling:** While the digital canvas complies with Bella + Canvas 3001 300 DPI guidelines with transparent alpha masking, a physical garment sample should be run before wide release.

---

## 5. Next Steps to Bring It to Production

1. **Claim Deployment & Custom Domain:**
   - Use the [Vercel Claim Link](https://vercel.com/claim-deployment?code=7315e541-a657-4e6f-8158-80916ffa4e26) to claim the project into your Vercel team.
   - Add your production domain (e.g., `store.example.com`).
2. **Switch to Production Prodigi Account:**
   - Create a live account at [prodigi.com](https://www.prodigi.com) and add a wholesale billing card.
   - Update `PRODIGI_API_KEY` to your live key.
   - Change `PRODIGI_API_BASE` in environment variables from `https://api.sandbox.prodigi.com/v4.0` to `https://api.prodigi.com/v4.0`.
3. **Switch to Live Stripe Account:**
   - Replace `STRIPE_SECRET_KEY` with live key (`sk_live_...`).
   - In Stripe Dashboard $\to$ Webhooks, register `https://<your-domain>/api/webhook` for `checkout.session.completed` and set `STRIPE_WEBHOOK_SECRET`.
4. **Order a Physical Sample:** Submit a test order with your live Prodigi key to examine print hand-feel, line sharpness, and color saturation on real ring-spun cotton.
