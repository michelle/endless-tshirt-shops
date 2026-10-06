# AstroThread — Custom Celestial Star Map T-Shirts

A custom direct-to-garment (DTG) on-demand t-shirt store is built, tested, and deployed to a publicly accessible URL.

- **Storefront URL:** [https://diameter-sake-hop-extras.trycloudflare.com](https://diameter-sake-hop-extras.trycloudflare.com)
- **Admin Operations Portal:** [https://diameter-sake-hop-extras.trycloudflare.com/admin](https://diameter-sake-hop-extras.trycloudflare.com/admin)
- **Health Endpoint:** [https://diameter-sake-hop-extras.trycloudflare.com/api/health](https://diameter-sake-hop-extras.trycloudflare.com/api/health)

---

## 1. Concept & DTG Advantage

**AstroThread** creates 1-of-1 personalized astronomical star charts representing the exact night sky above any location on Earth at any moment in history (e.g., weddings, birthdays, personal milestones, historic events).

### Why this leverages DTG technology:
- **Zero Setup Constraints:** Traditional screen printing requires burning separate physical mesh screens per design and color, incurring $50+ setup fees per unit.
- **Dynamic Astronomical Math:** AstroThread calculates Greenwich Mean Sidereal Time (GMST) and Local Sidereal Time (LST) for the customer's exact timestamp and geographic coordinates, projecting hundreds of bright navigational stars, constellations, altitude rings, and azimuth lines.
- **300 DPI Transparent Master Artwork:** The print file is generated dynamically at **4,680 × 5,790 px** with full alpha transparency. The transparent background ensures the water-based micro-pigment inks penetrate directly into the combed cotton fibers, eliminating the stiff rectangular rubber box typical of heat transfers.

---

## 2. Fulfillment & Payment Gating Architecture

- **Payment Provider:** Integrated with **Stripe Checkout**. Sessions enforce server-side pricing ($34.00 flat with standard tracked shipping), metadata validation, and address/phone collection.
- **Strict Payment Gating:** Direct-to-garment orders are **only** sent to Prodigi after Stripe confirms `payment_status = "paid"`. Unpaid sessions are rejected.
- **Idempotency & Race Protection:** Order fulfillment is handled via both a signed Stripe webhook (`checkout.session.completed`, `checkout.session.async_payment_succeeded`) and the customer return flow (`/checkout/success?session_id=...`). The pipeline is protected by:
  1. An in-memory mutex locking concurrent fulfillment attempts for the same session.
  2. A local atomic orders ledger (`data/orders.json`).
  3. Prodigi API's native `merchantReference` lookup and `idempotencyKey` parameter.
- **Prodigi Integration:**
  - Garment: Bella + Canvas 3001 Unisex Classic Tee (`GLOBAL-TEE-BC-3001`).
  - Colors: Obsidian Black, Navy Blue, Cloud White.
  - Sizing: `fitPrintArea` (preserves canvas margins and prevents cropping).
  - Asset ingestion: Prodigi downloads the 4,680 × 5,790 px master PNG directly from `/api/print/:token.png`.

---

## 3. How to Test

1. **Open the Storefront:** Navigate to [https://diameter-sake-hop-extras.trycloudflare.com](https://diameter-sake-hop-extras.trycloudflare.com).
2. **Customize in the Studio:**
   - Change the inscription (e.g., `"UNDER THIS SKY"`).
   - Change the date, time, and observation location (select from presets like Tokyo, Paris, San Francisco, or enter custom coordinates).
   - Select an ink palette (Starlight Gold, Astral Blue, Rose Nebula, Midnight Noir) and a shirt size (S–2XL).
   - Notice the live mockup update in real time.
3. **Checkout via Stripe:**
   - Click **Proceed to Stripe Checkout**.
   - Use the test card number **`4242 4242 4242 4242`**, any future expiration date (e.g., `12/30`), any 3-digit CVC, and a shipping address.
4. **Order Confirmation:**
   - Upon payment, you are redirected to `/checkout/success?session_id=...`.
   - The page displays the confirmed **Prodigi Order ID** (e.g., `ord_1178099`), garment specs, and an artwork inspection link.
5. **Inspect the Operations Ledger:**
   - Visit `/admin` to view order status, customer information, and print asset URLs.
6. **Automated Verification:**
   - Run `npm test` locally to verify the end-to-end health check, checkout session creation, 4680×5790 PNG verification, unpaid payment gating, and webhook HMAC signature validation.

---

## 4. Known Gaps

1. **Test-Mode Environments:** Transactions run in Stripe sandbox test mode; Prodigi orders run in the Prodigi sandbox environment (`https://api.sandbox.prodigi.com/v4.0`), where test orders are acknowledged and assets are ingested but not physically printed.
2. **Ephemeral Quick Tunnel:** The public deployment runs on a Cloudflare Quick Tunnel (`trycloudflare.com`). While active and stable during runtime, restarting the tunnel assigns a new hostname.
3. **Flat-Rate Pricing:** All orders charge a flat $34.00 USD with free standard shipping. Stripe Automatic Tax and destination-specific shipping surcharges are not dynamically calculated.
4. **Data Store:** Completed orders are written to an atomic JSON file store (`data/orders.json`) rather than an external SQL database.
5. **Transactional Emails:** Customer receipts are handled by Stripe; customer tracking notifications from Prodigi are not connected to a dedicated mailer.

---

## 5. Next Steps for Production

1. **Live Stripe Credentials:**
   - Claim the Stripe sandbox or switch to live API keys (`sk_live_...` / `pk_live_...`).
   - Enable Stripe Automatic Tax and configure origin address settings.
2. **Live Prodigi Print Account:**
   - Switch `PRODIGI_API_KEY` to a live production key and update `PRODIGI_BASE` to `https://api.prodigi.com/v4.0`.
   - Place a live sample order to physically inspect ink density, fine constellation line definition, and wash durability on the Bella + Canvas 3001 garment.
3. **Permanent Hosting & Custom Domain:**
   - Deploy to a production platform (Render, Railway, Fly.io, Vercel, or a named Cloudflare Tunnel with DNS routing) with a custom domain (e.g., `https://astrothread.com`).
   - Set a permanent `PUBLIC_URL` so print asset URLs and Stripe webhook destinations remain fixed.
4. **Transactional Email Service:**
   - Integrate an email provider (such as Resend or Postmark) to dispatch branded confirmation emails and shipping tracking links.
5. **Database Migration:**
   - Migrate order storage from `data/orders.json` to PostgreSQL (e.g., Supabase or Neon) with proper indexing.
