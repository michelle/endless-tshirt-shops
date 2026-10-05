# Celestia — Custom Astronomical Starmap T-Shirt Store

The store is built, verified end-to-end, and deployed to a publicly accessible URL:
**Live Storefront URL:** [https://homeless-easy-experienced-memorabilia.trycloudflare.com](https://homeless-easy-experienced-memorabilia.trycloudflare.com)

---

## 1. Concept & DTG Advantage

**Celestia** is a made-to-order astronomical t-shirt brand that captures the exact night sky over any life-defining moment (an anniversary, proposal, birth, or personal milestone). 

Because we use Direct-to-Garment (DTG) printing, every garment is a true 1-of-1 print with zero setup costs:
- **Astrophysical Precision:** The customer selects a date, time, and coordinates (or chooses from world cities). The server calculates Julian Date, Greenwich Mean Sidereal Time (GMST), Local Sidereal Time (LST), and spherical coordinates (Right Ascension & Declination $\to$ Altitude & Azimuth) using the curated Yale Bright Star Catalog.
- **Garment-Optimized Print Design:** Traditional screen printing cannot economically produce personalized star charts. With DTG, micro-pigment water-based ink is injected directly into ring-spun cotton. The canvas is rendered at **4680 × 5790 px at 300 DPI** (the exact native print dimensions for the Bella + Canvas 3001 Unisex Tee) with an authentic **transparent background** outside the circular celestial disc, ensuring no square "sticker" patch is printed onto dark garments.

---

## 2. Payments & Automated Fulfillment Pipeline

1. **Payment Provider (Stripe):**
   - Integrated with Stripe Checkout for hosted payments, dynamic payment methods, and international shipping address collection across 12 countries.
   - Dedicated webhook endpoint at `/webhook/stripe` listening for `checkout.session.completed` and `payment_intent.succeeded` events with cryptographic signature verification.
   - Idempotency guards prevent duplicate fulfillment on webhook retries or refresh events.

2. **Fulfillment (Prodigi Print API v4):**
   - **Gated strictly behind successful payment:** Shirts are only dispatched to Prodigi once `payment_status === "paid"` or `status === "succeeded"`.
   - Uses SKU `GLOBAL-TEE-BC-3001` with validated color mappings (`black`, `navy blue`, `asphalt`, `dark heather grey`) and lowercase sizes (`s`, `m`, `l`, `xl`, `2xl`).
   - Normalizes empty optional address fields (`line2`, `stateOrCounty`, `phoneNumber`) to `null` to comply with Prodigi validation.
   - Prodigi downloads the print-ready asset asynchronously over HTTPS from `/art/:orderId.png`.

---

## 3. How to Test

### A. Live Interactive Browser Test
1. Visit the live storefront: [https://homeless-easy-experienced-memorabilia.trycloudflare.com](https://homeless-easy-experienced-memorabilia.trycloudflare.com)
2. In the **Personalize Your Sky** studio, change the observation city, date, time, title, and dedication. Notice the interactive garment preview updates in real-time.
3. Select your shirt color and unisex size.
4. Click **"Order Custom Shirt with Stripe"** to test the hosted Stripe Checkout flow with Stripe test card numbers (e.g., `4242 4242 4242 4242`, any future expiration, any CVC).
5. Alternatively, click **"⚡ One-Click Instant Sandbox Test"** to simulate an immediate card payment and fulfillment submission.
6. Upon payment completion, you are redirected to `/success` where the confirmed **Prodigi Order ID** and fulfillment parameters are displayed.
7. Click **"View Full 300 DPI Print File ↗"** to inspect the 4680 × 5790 transparent master print asset.

### B. Automated End-to-End Test Suite
You can also run the automated verification script from the project root:
```bash
node test-e2e.mjs
```
During verification, test order **`ord_1177360`** was created and paid (`pi_3UN2fLEXcAdFRXIt1SL99lLE`), and Prodigi reported:
- `downloadAssets: "Complete"`
- `Item status: Ok`
- `MD5 hash: c28a4c780b090a34a59159880cffa5b0`

---

## 4. Known Gaps

1. **Ephemeral Tunnel URL:** The store is currently tunneled via Cloudflare Quick Tunnel (`*.trycloudflare.com`), which is ephemeral across restarts.
2. **Sandbox Credentials:** Both Stripe and Prodigi are currently operating with sandbox test keys (`rkcs_test_...` and `test_...`). Real physical shirts are not queued for physical manufacturing until switched to live keys.
3. **Local Storage:** Orders and session states are persisted in `./data/orders.json`. A high-volume production setup needs a shared database.
4. **Geocoding Database:** The customizer currently provides a curated set of 25 global cities; freeform address geocoding relies on user inputs.

---

## 5. Next Steps for Production

1. **Set Up Live Stripe Account:**
   - Replace `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` with live production keys (`sk_live_...` and `whsec_...`).
   - Claim or activate your Stripe merchant account in the dashboard.
2. **Set Up Live Prodigi Account:**
   - Fund your Prodigi wallet and set `PRODIGI_API_KEY` to your live API key (`live_...`).
   - Switch the API base URL in `lib/prodigi.js` from `api.sandbox.prodigi.com` to `api.prodigi.com`.
3. **Permanent Production Hosting:**
   - Deploy to a durable cloud host (e.g. Vercel, Render, Railway, or AWS ECS) with a custom domain (e.g. `https://celestia-tees.com`).
   - Point your Stripe Webhook destination to `https://<your-domain>/webhook/stripe`.
4. **Address Autocomplete:**
   - Add the Google Places API or Mapbox Geocoding API to enable instant address autocomplete for any village, town, or city on Earth.
5. **Database Migration:**
   - Point `lib/storage.js` to a hosted database (such as PostgreSQL or Supabase) with ACID transactions for order management.
