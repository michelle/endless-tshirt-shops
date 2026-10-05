Here's the build.

## 🌌 NightSky Tee — live at https://objects-ownership-rim-vitamin.trycloudflare.com

**The concept.** Every shirt is a real moment rendered into the sky above it. Pick any place, any date — a birthday, an anniversary, the night you said yes — and we compute the actual altitude/azimuth of 80+ named stars at that minute from those coordinates, draw the horizon ring with the cardinal directions, and DTG (direct-to-garment) print it onto a Bella+Canvas 3001 tee in your chosen color and size. Each shirt is genuinely unique —same time, same place, will always produce the same shirt.

DTG was chosen deliberately: it lays water-based ink into cotton fibres, so a full-color star map with soft glow gradients renders cleanly on dark fabrics, and small print runs (one shirt per order) stay economical.

**The stack.**
- 553-LOC Express server (`server.js`)
- Custom astronomy library (`lib/astro.js` — Yale Bright Star Catalog subset, Julian date, GMST, alt/az, inverse azimuthal-equidistant projection)
- Per-shirt SVG → 4680×5790 PNG renderer (`lib/starmap.js` + `@resvg/resvg-js`)
- **Stripe Checkout** for payments (hosted page; webhook wired up + success-page fallback, both idempotent)
- **Prodigi Print API** (`lib/prodigi.js`) — sandbox-tested end-to-end
- Vanilla HTML frontend with live preview, debounced city autocomplete, gallery of 4 pre-rendered examples
- Public HTTPS via **Cloudflare Quick Tunnel** (`start.sh` orchestrates everything)

A polished end-to-end run: 9 real Prodigi sandbox orders during testing, including ord_1177344, 1177351, 1177352, 1177358, 1177359.

## How to test it

1. Open the live URL: **https://objects-ownership-rim-vitamin.trycloudflare.com**
2. Change the title/subtitle, date, or location — the preview re-renders server-side as you type.
3. Fill in shipping and click **Buy & print**.
4. You'll be redirected to a Stripe-hosted checkout. Pay with:
   - `4242 4242 4242 4242` — succeeds (any expiry, any CVC, any ZIP)
   - `4000 0000 0000 9995` — declined
   - `5555 5555 5555 4444` — Mastercard
5. After paying you land back on `/success` and the design is auto-submitted to Prodigi.

You can also call the API directly:
```bash
curl -X POST https://objects-ownership-rim-vitamin.trycloudflare.com/api/preview \
  -H "Content-Type: application/json" \
  -d '{"date":"2024-06-14T20:00:00Z","lat":41.9028,"lon":12.4964,
       "whereLabel":"Rome, Italy","messageTitle":"The Night We Met",
       "messageSub":"And the world clicked into place","shirtColor":"black"}'
# → returns a 4680×5790 PNG of the actual sky over Rome at that moment
```

## Known gaps I want to flag

1. **Stripe sandbox only.** The secret key is a `rkcs_test_…` restricted key from the benchmark wallet, so all charges will be **test-mode**. Production needs your own `sk_live_…` in `.env`.
2. **Prodigi sandbox only.** Same story with the API key — orders shouldn't be created against the live API until you swap keys. The full pipeline is wired and tested.
3. **Cloudflare Quick Tunnel is ephemeral.** Every time you restart `cloudflared` you get a fresh `*.trycloudflare.com` URL, and the existing one stops working. For real production you should:
   - Move to a named Cloudflare Tunnel (with a Cloudflare account + domain) **or**
   - Deploy to a real host (Render/Heroku/Fly/Railway) and put the tunnel inside
4. **Stripe webhook is wired but not registered.** The dashboard-side webhook URL hasn't been registered against the new tunnel URL. The success-page fallback handles synchronous card payments, but async methods (SEPA, ACH) won't auto-submit to Prodigi until you configure the webhook endpoint in the Stripe dashboard.
5. **In-memory order store.** Restarting the server loses order history. Swap `lib/storage.js` for Postgres/Firestore before going live.
6. **City autocomplete = ~50 hardcoded cities.** Real production would use Mapbox/Google Geocoding.
7. **Star catalog is curated ~80 stars.** Enough for a beautiful t-shirt but if anyone wants the whole Yale catalog (~9,000 stars) it would be a small upgrade.
8. **No anti-spam / bot protection.** Anyone can submit `/api/preview` (which does real CPU work). Add Cloudflare Turnstile or a simple rate-limit before going live.

## To bring it to production

1. Create a real Stripe account, replace `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `.env` with your live keys.
2. Create a real Prodigi account, replace `PRODIGI_API_KEY` and switch `live = true` (or set the right base URL).
3. Register the webhook endpoint in the Stripe dashboard to point at `${PUBLIC_URL}/webhook/stripe` for the `checkout.session.completed` and `checkout.session.async_payment_succeeded` events.
4. Deploy somewhere durable — Render/Heroku/Railway/Vercel are all fine; this is a single Node process. Point your domain at it, set `PUBLIC_URL` to the real HTTPS URL.
5. Replace the in-memory store with a database (Postgres is the obvious choice).
6. (Optional) Add Mapbox/Google for proper address autocomplete; add your full star catalog; add a couple of real product mockups for the gallery.

Everything below the live URL is in `/private/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-workspace.3k1BwH/nightsky-tee/`, with a README at the root that explains the architecture and how to dev further.
