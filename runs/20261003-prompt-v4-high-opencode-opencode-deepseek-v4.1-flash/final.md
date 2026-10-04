Everything is verified end-to-end. Here's the summary.

---

# RESONA — a one-of-one generative t-shirt store

**Live store:** https://temporary-turbo-marimba-in5lld5.vercel.app
**Claim this deployment (keep it permanently):** https://vercel.com/claim-deployment?code=6ab60428-ff99-45cb-98c9-5d4f0e45601b
*(Vercel temporary deployments expire ~60 minutes after creation — claim it, or redeploy under your own account, for a durable URL.)*

## The concept
DTG's superpower is that every garment is printed individually with unlimited colour. So the store sells **artwork that literally cannot be mass-produced**: the customer's name seeds a deterministic generative engine that draws a topographic "aura" medallion in a chosen palette and style, printed full-colour on a Bella+Canvas 3001. Change one letter and the whole composition changes. Each shirt is stamped **1 of 1**.

- Palettes: Aurora, Solar, Ember, Ocean, Orchid, Jade, Gilded, Mono
- Styles: **Aura** (contour lines), **Radiate** (light beams), **Orbit** (rings + dust)
- Black or white shirt, sizes S–4XL, $38 with free shipping

## Architecture
| Concern | Choice |
|---|---|
| App | Next.js 14 (App Router) + TypeScript on Vercel |
| Payments | **Stripe Checkout** (hosted) |
| Fulfilment | **Prodigi Print API v4** (sandbox) |
| Design | Deterministic SVG generator + `opentype.js` text→outlines |
| Rasteriser | `@resvg/resvg-wasm` (platform-independent, no native modules) |

Flow: configurator → `POST /api/checkout` → Stripe → **`/success` verifies `payment_status === "paid"`** → Prodigi `POST /orders` with a signed, deterministic design URL → Prodigi downloads the print-ready PNG. If payment isn't paid, **no order is ever sent to Prodigi**. Duplicate submissions are impossible (Prodigi `idempotencyKey = stripe-<session>`).

## How to test
1. Open the live URL.
2. Type a name, pick a palette/style/shirt/size (the shirt mockup updates live).
3. Click **Create & buy**.
4. Pay with the Stripe test card: **`4242 4242 4242 4242`**, any future expiry, any CVC, any ZIP.
5. The confirmation page shows the **Prodigi order ID** and status. Reloading it re-shows the same order (no duplicate).

I ran this exact flow headlessly against the live URL. Result:
- Stripe payment succeeded → Prodigi order **`ord_1176955`** created with the public artwork URL.
- Prodigi fetched the asset: `downloadAssets: Complete`, item status `Ok`, asset status `Complete`.

## Known gaps
- **Temporary URL expires in ~60 min** unless claimed (link above).
- **Prodigi sandbox doesn't print, ship, or charge** — orders sit at `InProgress`.
- **No order database** — state lives only in Stripe + Prodigi; no admin/support view.
- **Fulfilment is driven by the `/success` page** (webhook route exists but is disabled without a signing secret).
- **Asset URLs are tied to the deployment host** — a stable custom domain is required so already-paid orders can still be printed after a redeploy.
- **Print file is exported at 3600 px (~231 dpi)** for serverless speed (Prodigi scales it); raise `PRINT_EXPORT_WIDTH` for full 300 dpi at the cost of slower renders.
- No tax/shipping-rate rules; only Stripe's receipt email.

## To take it to production
1. Replace the sandbox Stripe key with a **live** secret key on a claimed account; complete onboarding.
2. Point `PRODIGI_API_BASE` at `https://api.prodigi.com/v4.0` with a **live** Prodigi key, and place a sample order.
3. Set a strong `DESIGN_SECRET` and a **stable custom domain** (so asset URLs never move).
4. Register the Stripe webhook (`checkout.session.completed`) and set `STRIPE_WEBHOOK_SECRET`.
5. Add a database + admin view, order-confirmation email, and tax/shipping rules.
6. Re-check pricing: Prodigi costs ≈ **$11.89 + $4.62** shipping to the US; the store charges $38.

The full source is in `store/` (see `README.md` for local setup). `.env.local.example` lists the required variables.
