The store is built, deployed, and verified end to end with real test payments. Nothing is left running locally.

## What I built

**Orrery** at https://benchmark-20260907-prompt-v3-rerun-seven.vercel.app

Each shirt shows where every planet was around the Sun on a date the customer picks. Positions are computed from JPL orbital elements by solving Kepler's equation, so the layout is genuinely unique to the date. The customer also chooses a caption, one of 10 tee colours, an accent colour for Earth, whole system or inner planets, planet labels, and Pluto. The live preview is the same SVG that becomes the print file, rasterised server-side to a 4677×5881 px transparent PNG at 300 dpi for Prodigi's front DTG print area.

- **Payments**: Stripe Checkout, hosted page, with shipping address and phone collected there. I provisioned a claimable Stripe sandbox with the Stripe CLI and its keys are stored in the config file the benchmark pointed at.
- **Fulfilment**: Stripe webhook → signature check → only when `payment_status` is paid → Prodigi order created with `idempotencyKey` and `merchantReference` set to the session id. Prodigi fetches the print file from a route that re-renders the artwork from the paid session's metadata, so unpaid sessions get a 402 and the print always matches what was bought. The order page also re-checks fulfilment as a fallback, and every path is idempotent. No database is needed.
- **Code**: `src/lib/astro.ts` (positions), `src/lib/design.ts` (SVG), `src/lib/fulfil.ts` (Stripe → Prodigi), README with the full flow and production steps.

## Verified

| Check | Result |
| --- | --- |
| Test card payment via headless Chrome, US address | Paid, Prodigi order `ord_1171023`, Prodigi downloaded the print file |
| Payment with the success page blocked (webhook only), UK address, qty 2 | Paid, Prodigi order `ord_1171025` |
| Unpaid session | No Prodigi order, print route returns 402 |

## How to test it

1. Open the site, pick a date and options, click "Buy this shirt".
2. In Checkout use card `4242 4242 4242 4242`, any future expiry, any CVC, any address in the 37 supported countries.
3. You land on `/order/<session>`, which shows the design, address, and live Prodigi status. Prodigi sandbox orders stop at "Artwork received"; they never print.
4. Inspect orders in the Stripe sandbox dashboard via the claim link below, or with `stripe checkout sessions list` using the benchmark config file.

## Known gaps

- Prodigi sandbox orders are stored only; the print scale and placement have not been checked on a physical shirt. Order one sample before launch.
- Shipping is a flat "included" price of $34 for every country. Prodigi cost is about $17 to the US and $18 to the UK, but some countries will be pricier. No sales tax or VAT is calculated.
- No admin view, no order emails beyond Stripe's receipt, and no Prodigi callback for shipping updates. The order page polls Prodigi instead.
- Time is fixed at 12:00 UTC. Mercury moves about 4° a day, so a time-of-day option would add precision.
- The Stripe sandbox is shared-key restricted and the Prodigi sandbox key is shared with other runs, so other orders appear in Prodigi's list.
- I turned off Vercel deployment protection on this project so Stripe and Prodigi can reach it, and pinned the framework to Next.js in vercel.json because auto-detection had failed.

## To go to production

1. Claim the Stripe sandbox before **2026-09-15** at https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUREQ29BRGtjaHJGUG9qLDE3ODk0NTcyNTYv100fs0qL8vL (or run `stripe sandbox claim`), activate the account, then swap in a live secret key, create a live webhook for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, and set its `STRIPE_WEBHOOK_SECRET` in Vercel.
2. Get a live Prodigi key, set `PRODIGI_API_BASE` to `https://api.prodigi.com`, and add a payment method to the Prodigi account.
3. Add a custom domain to the Vercel project, or set `NEXT_PUBLIC_SITE_URL`.
4. Revisit price, sizes, colours, and the country list in `src/lib/catalog.ts` and `src/lib/stripe.ts`, and consider Stripe Tax plus per-region shipping rates.
5. Write terms, privacy, and returns pages, then order a sample tee to sign off print quality.
