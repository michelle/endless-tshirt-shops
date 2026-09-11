## Done — Constellate is live

**https://benchmark-20260911-prompt-v3-high-c-rouge.vercel.app**

### The concept
**Constellate** — every shirt is a one-of-a-kind, algorithmically generated constellation drawn from the customer's own names, a meaningful date, and an optional subtitle (place, message, etc.). It's a genuine use of DTG: nothing is pre-designed or stocked — each print is a unique image no two customers will ever get the same one. There's a live generator, 4 color palettes, 3 garment colors, sizes S–2XL.

### How it works end to end
1. `/design` — live SVG preview regenerates instantly as you type (deterministic seeded generator, so what you see is exactly what prints).
2. "Continue to payment" → server creates a **Stripe Checkout Session** (hosted page, card payment, US shipping address collection).
3. Stripe webhook (`checkout.session.completed`, signature-verified) fires **only when `payment_status === "paid"`**, then places a **Prodigi** order (Gildan 64000 tee, DTG front print) via their Orders API, pointing Prodigi at a `/api/artwork` URL that re-renders the exact same design server-side as a 3000×3750 print-ready PNG. The Prodigi call is idempotent on the Stripe session ID, so webhook retries can't double-print.
4. `/order/success` confirms payment and shows live Prodigi fulfillment status.

I verified this isn't just wired up but actually works: ran a full Playwright pass against the live site using Stripe's `4242...` test card, and confirmed via the Prodigi API that a real sandbox order (`ord_1171691`) was created with the correct recipient, SKU, attributes, and artwork URL.

### How you can test it
Go to the site, fill in the design fields, pick options, click through to Stripe Checkout, and pay with `4242 4242 4242 4242`, any future expiry, any CVC, any US billing/shipping address. You'll land on the success page with a live Prodigi print status. This is all sandbox/test mode — no real money moves and no physical shirt actually ships.

### Payment provider
Stripe, in test mode. I provisioned a **claimable sandbox account** via the Stripe CLI's non-interactive flow (no login needed) under your email. **You should claim it** via `stripe sandbox claim` or the claim URL before **2026-09-18**, when it expires — I can locate that URL again if you didn't note it. To go live, you'd claim the sandbox, verify a real Stripe account, and swap in live keys.

### Known gaps / what's next for production
- **US shipping only**, and a flat $36 price (covers ~$16.90 landed Prodigi cost + margin) — no dynamic international shipping/pricing yet.
- **No sales tax collection** — Stripe Tax isn't enabled.
- **No content moderation** on the free-text fields before they go straight to print — someone could type something offensive and it'd auto-print. Worth adding a filter or manual review queue before going live.
- **No order database/admin view** — Stripe Dashboard + Prodigi Dashboard are the source of truth; there's no internal order list, refund flow, or customer-facing order lookup beyond the one-time success page.
- **No Prodigi shipment webhooks wired up** — you get "in production" at order-creation time but not live tracking/shipped notifications back to the customer.
- Real Prodigi API keys + a live (non-sandbox) Prodigi account, plus reviewing Prodigi's actual live shipping rates/coverage, before real orders go out.
- Custom domain isn't set up — it's on the `*.vercel.app` alias.
