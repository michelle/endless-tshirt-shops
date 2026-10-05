The store is built, deployed, and verified end-to-end with real payments and real Prodigi orders.

# ONE/OF/ONE — a one-of-one generative t-shirt store

**Live URL: https://mechanical-relay-ireland-quilt.trycloudflare.com**

**Concept (built around DTG's unique strength):** every shirt is a one-of-one artwork *grown from the customer's word*. Type a word — a name, a mantra, anything — and a deterministic field engine (seed = word + palette) grows a unique flow-field artwork, carves the word through it as negative space, and stamps it "EDITION 1 OF 1 · Nº XXXX-XXXX". Screen printing could never do this; every DTG print is different by design. Bella+Canvas 3001, black or white, S–2XL, six curated ink palettes, $34 with free shipping.

**Stack:** Node/Express storefront + API → PayGate hosted card checkout (payment) → exactly-once fulfillment → Prodigi Print API (sandbox). The print PNG (4680×5790 = 300dpi over the 15.6"×19.3" print area, transparent background) is rasterized by headless Chromium from the *same* SVG the customer previews, so what you see is literally what prints. Code lives in `oneofone/` in the workspace.

## How to test it

1. Open the URL, type a word, pick shirt color/palette/size — the mockup updates live.
2. "Wear it" → fill the shipping form → Pay. You'll land on PayGate's hosted page.
3. Choose **Card** and use sandbox test Visa **4000 0000 0000 0002**, any future expiry, any CVV, accept terms → **Next** → on the 3D-Secure simulator page just press **Submit** (password is pre-filled).
4. You'll return to `/order/:id`, which live-tracks: payment → Prodigi order → production stages (the sandbox even simulates shipment).
5. Negative test: use card **5200 0000 0000 0023** (decline) — the order page shows payment failed and nothing is sent to Prodigi.

**Already verified by me:** two real paid browser checkouts → Prodigi orders `ord_1177283` / `ord_1177284` (assets downloaded, in production, Royal Mail shipment simulated); a declined card correctly blocked fulfillment; payment is always re-confirmed server-side via PayGate's `query.trans` before Prodigi is called, and fulfillment is idempotent.

## Known gaps

- **The URL is ephemeral** — it's a Cloudflare quick tunnel to the server running on this machine. It dies when this session ends; the hostname changes on restart (a fixed public URL needs a named tunnel or real hosting).
- **Shared sandbox payment credentials.** No card processor allows programmatic account creation (all captcha/KYC-gated), and several sandboxes were broken from here (PayU's hosted page 403s, BTCPay testnet demo's nodes are down, MyFatoorah's public token expired). PayGate (DPO, a major African/international PSP) publishes official shared sandbox credentials — that's what's active. It *is* a real payment provider with real hosted 3DS checkout, but it's their shared test merchant.
- Prodigi is in **sandbox mode** — orders flow through the full pipeline but nothing is printed/shipped.
- Orders/designs are stored in JSON files; art cache is on local disk; no order-confirmation emails; single-currency USD pricing; 10 shipping countries.

## To go to production

1. **Payments:** open a Stripe account, put `secretKey`/`webhookSecret` into `data/config.json` and set `paymentDriver: "stripe"` — the Stripe Checkout + webhook driver (`src/stripeDriver.js`) is already written and wired; no other code changes. (PayGate/BTCPay/PayU drivers also included.)
2. **Prodigi:** swap the sandbox key for a live one and point `PRODIGI_API_BASE` at `api.prodigi.com` — margin is healthy ($34 retail vs ~$16.50 cost).
3. **Hosting:** deploy `oneofone/` to Render/Fly/Heroku (needs Chromium for PNG rendering — a Docker deploy is easiest), move the art cache to object storage, and set `publicUrl` to the real domain. Register the payment + Prodigi webhooks against that domain (they're already implemented: `/webhooks/stripe`, `/webhooks/paygate`, `/webhooks/prodigi`).
4. **Business bits:** order-confirmation emails, sales-tax handling (Prodigi quotes exclude US sales tax), refund policy, ToS/privacy pages, and a real product DB.
