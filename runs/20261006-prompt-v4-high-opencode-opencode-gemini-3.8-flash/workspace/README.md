# AstroThread — 1-of-1 Custom Celestial Star Map T-Shirts

A fully functional, on-demand custom t-shirt store taking full advantage of direct-to-garment (DTG) printing technology. AstroThread dynamically calculates and prints an authentic 1-of-1 astronomical star chart representing the exact night sky above any place on Earth at any moment in history.

- **Storefront URL:** [https://diameter-sake-hop-extras.trycloudflare.com](https://diameter-sake-hop-extras.trycloudflare.com)
- **Admin Portal:** [https://diameter-sake-hop-extras.trycloudflare.com/admin](https://diameter-sake-hop-extras.trycloudflare.com/admin)
- **Health Check:** [https://diameter-sake-hop-extras.trycloudflare.com/api/health](https://diameter-sake-hop-extras.trycloudflare.com/api/health)

---

## The Concept & DTG Advantage

Traditional screen printing requires burning distinct physical mesh screens for every color and graphic, creating a high minimum order quantity and $50+ setup fees per screen. This makes individual customization economically unfeasible.

**AstroThread** takes full advantage of **Direct-to-Garment (DTG)** printing:
1. **True 1-of-1 Generative Art:** When a customer selects a date (e.g. wedding day, birthday, graduation, momentous milestone) and coordinates, the system calculates Greenwich Mean Sidereal Time (GMST) and Local Sidereal Time (LST), computing azimuth and altitude for hundreds of navigational stars and constellations.
2. **Transparent DTG Print Master:** The artwork is generated at **4,680 × 5,790 px (300 DPI)** with anti-aliased transparency. The transparent background ensures the ink prints cleanly into the garment cotton fibers without an unsightly rubbery box.
3. **Zero Setup Cost:** Every customer receives a museum-grade personalized garment at a flat retail price ($34.00) with standard tracked shipping included.

---

## Architecture & Fulfillment Flow

1. **Interactive Studio:** Customer personalizes their inscription, date, time, location, ink palette, and garment color/size with real-time responsive previews.
2. **Stripe Checkout:** Customer proceeds to a PCI-DSS compliant Stripe-hosted Checkout session with address and phone collection.
3. **Strict Payment Gating:** Shirts are **only** sent to Prodigi after Stripe reports `payment_status = "paid"`. Unpaid sessions are explicitly refused.
4. **Idempotent Dual-Path Fulfillment:**
   - Handled via signed Stripe webhook (`checkout.session.completed`, `checkout.session.async_payment_succeeded`).
   - Also verified on customer return redirect (`/checkout/success?session_id=...`).
   - Protected by an in-memory process mutex, local order deduplication, and Prodigi's native `idempotencyKey` and `merchantReference` verification. An order cannot be submitted twice.
5. **Prodigi Print API v4.0:**
   - Garment: Bella + Canvas 3001 Unisex Classic Tee (`GLOBAL-TEE-BC-3001`).
   - Sizing: `fitPrintArea` (preserves canvas margins and prevents cropping).
   - Asset ingestion: Prodigi immediately downloads the 4680×5790 PNG asset from `/api/print/:token.png`.

---

## How to Test

1. Visit the live storefront: [https://diameter-sake-hop-extras.trycloudflare.com](https://diameter-sake-hop-extras.trycloudflare.com)
2. In **The Studio**, enter a custom inscription, pick a date/time, choose a city or enter custom coordinates, and select an ink theme and shirt size.
3. Click **Proceed to Stripe Checkout**.
4. In Stripe Checkout, use the test card **`4242 4242 4242 4242`**, any future expiration date (e.g. `12/30`), any 3-digit CVC, and a shipping address.
5. Complete payment and get redirected to the order confirmation page.
6. The confirmation page polls the order status and displays the confirmed **Prodigi Order ID** (e.g., `ord_1178099`).
7. Open the **Admin Portal** at `/admin` to see the live ledger and inspect the 4680×5790 px print asset.

---

## Known Gaps

1. **Stripe Test Mode:** Transactions run in Stripe sandbox test mode; real cards are not charged.
2. **Prodigi Sandbox Environment:** Orders are processed in the Prodigi test lab (`https://api.sandbox.prodigi.com/v4.0`). Physical shirts are not printed or shipped in sandbox mode.
3. **Ephemeral Cloudflare Tunnel:** The current deployment uses a Cloudflare Quick Tunnel (`trycloudflare.com`). It remains active while the process runs, but restarting assigns a new hostname.
4. **Data Persistence:** Orders are stored in a local atomic JSON store (`data/orders.json`). Production should use PostgreSQL or SQLite.
5. **Tax & Currency Localization:** Pricing is flat $34 USD worldwide with standard shipping included; dynamic sales tax/VAT calculation is not enabled.

---

## Next Steps for Production

1. **Claim & Activate Live Stripe Account:**
   - Switch from the temporary sandbox keys to live Stripe API keys (`sk_live_...` / `pk_live_...`).
   - Enable Stripe Automatic Tax in the Stripe Dashboard.
2. **Switch to Production Prodigi API:**
   - Update `PRODIGI_API_KEY` to live key and `PRODIGI_BASE` to `https://api.prodigi.com/v4.0`.
   - Submit a test order with real payment to inspect the printed Bella+Canvas garment.
3. **Deploy to Permanent Infrastructure:**
   - Deploy to Vercel, Render, Railway, AWS, or a Cloudflare Named Tunnel with a custom domain (e.g. `https://astrothread.com`).
   - Set a stable `PUBLIC_URL` so webhook callbacks and print asset URLs remain permanent.
4. **Transactional Email:**
   - Add Postmark or Resend for automated order receipts and Prodigi tracking number notifications.
5. **Database Migration:**
   - Migrate `data/orders.json` to PostgreSQL (e.g. Supabase or Neon).
