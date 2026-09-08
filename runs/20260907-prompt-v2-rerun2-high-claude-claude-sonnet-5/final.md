The site looks polished and cohesive across pages — great retro-dossier aesthetic, clean product grid, working add-to-cart flow. The store is fully deployed and functioning. Here's the rundown:

## What's live

**https://benchmark-20260907-prompt-v2-rerun2-seven.vercel.app**

**The Bureau of Ordinary Monsters** — a fictional agency that gives cryptids something scarier than folklore: performance reviews. Each of 6 shirts is a retro "employee badge" for a cryptid stuck with a mundane government job (Bigfoot, Field Ops "Employee of the Month"; Nessie, Underwater Compliance; Chupacabra, Livestock Loss Prevention; Mothman, Night Shift Supervisor; Jackalope, Rural Wildlife Liaison; Yeti, Cold Storage & Logistics). All artwork is generated code — no stock art or third-party image assets — via a `/api/art/[slug]` route that renders each badge as a transparent PNG on demand, which doubles as both the product photo and the actual print file sent to Prodigi.

Full flow: homepage → product page (size/color/qty picker) → cart (localStorage-backed) → checkout (shipping form) → **real order placed against Prodigi's sandbox API**, with a live quote (item + shipping cost) shown on confirmation.

## How to test it
1. Visit the site, click into a couple of products, add different sizes/colors to cart.
2. Go to `/cart`, adjust quantities, proceed to `/checkout`.
3. Fill in any shipping address (e.g. US ZIP works well) and submit — it calls Prodigi's sandbox `/quotes` and `/Orders` endpoints for real and shows you the returned order ID and cost breakdown.
4. I already exercised this end-to-end from the command line against the live deployment (order `ord_1170976`, $16.93 total for a Yeti tee) to confirm it's not just a UI mock.

## Known gaps
- **No payment collection.** There's no Stripe/payment processor wired in — checkout is "sandbox order only," clearly labeled as such on the confirmation screen. This was the biggest scope decision I made given only a Prodigi key was provided.
- **Sandbox never fulfills.** Per Prodigi's docs, sandbox orders stay `InProgress` forever and never actually download the print asset or charge anything — this is expected sandbox behavior, not a bug.
- Cart is localStorage-only (per-browser, no accounts/order history).
- No custom 404 page, no sitemap/robots.txt, no OG share image.
- Only one product template (Gildan 64000 tee, one SKU) — no hoodies/other apparel.

## To take this to production
1. **Swap in a live Prodigi API key** (`PRODIGI_API_KEY` env var) and confirm pricing/margins with real (not sandbox) costs.
2. **Add real payment collection** (Stripe Checkout or Elements) before placing the Prodigi order — right now nothing charges the customer.
3. Add a Prodigi **webhook** (`callbackUrl` on order creation) so order status/shipping updates flow back instead of relying on polling.
4. Point a real domain at the Vercel project and set `NODE_ENV`/analytics as desired.
5. Consider order persistence (a DB) for order history, receipts, and customer support instead of relying solely on Prodigi's dashboard.
