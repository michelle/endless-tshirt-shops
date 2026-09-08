The store is built, deployed, and verified end to end with a real paid test checkout on the live site.

**Live store:** https://benchmark-20260908-prompt-v3-rerun2-jet.vercel.app

## What I built

**Concept: "Under These Stars."** The customer enters a place, date and local time. The site computes the real night sky above that spot at that minute, using 5,044 stars from the Yale Bright Star Catalogue with constellation lines, and prints it with the customer's own words. Every shirt is unique, the ink colour adapts to the garment, and the live preview is drawn by the same code that generates the print file. The print file is a 4665×5844 transparent PNG, the full front print area at 300 dpi, rendered on demand from an HMAC-signed token, so there is no database to run.

**Payments and fulfilment.** Stripe Checkout, hosted, with address and phone collection and two flat shipping rates mapped to Prodigi Standard and Express. A Prodigi order is created only inside the Stripe webhook after the session reports `paid`. Fulfilment is idempotent (session metadata plus Prodigi idempotency key), and the webhook returns a 5xx on failure so Stripe retries. The order page polls status and has a two-minute safety net in case the webhook is down.

**Verified.** A headless browser paid on the live site with a test card. Stripe's webhook hit Vercel, which created Prodigi sandbox order ord_1171080, and Prodigi downloaded the print asset from the public URL (asset "Complete", item "Ok"). Astronomy checks pass (Polaris altitude equals latitude, J2000 sidereal time exact, DST edge cases). Source is in the workspace `app/` folder with a README.

## How to test

1. Open the live URL, try the example chips, design a shirt, click "Buy this shirt".
2. Pay with card `4242 4242 4242 4242`, any future expiry and CVC, any address.
3. You land on the order page. Within seconds it shows "Sent to the printer" with the Prodigi job id.
4. Stripe dashboard access: the CLI provisioned an unclaimed sandbox. Claim it via `stripe sandbox claim` before 2026-09-15 or it expires.

## Known gaps

- Stripe is an unclaimed test sandbox and Prodigi is sandbox, so no shirt actually ships.
- Map shows stars and constellation lines only, no Moon, planets or Milky Way. One SKU (Gildan 64000), 8 colours, XS to 4XL.
- Flat-rate shipping in USD only, no tax calculation, curated country list rather than live Prodigi availability checks.
- No customer emails beyond Stripe's receipt, and no admin UI. Stripe and Prodigi dashboards serve as admin.
- Geocoding uses the free Open-Meteo API with no SLA.
- Side effect to disclose: killing my local Stripe listener also killed three Stripe listeners belonging to other benchmark worktrees on this machine.

## To bring it to production

- Claim the Stripe sandbox, then switch to a live account: set a live secret key, register a live webhook for `/api/webhooks/stripe`, and rotate `DESIGN_SIGNING_SECRET`.
- Point `PRODIGI_API_URL` at the live API with a live key and add a payment method in Prodigi.
- Order a physical sample to confirm print placement and ink on light versus dark garments.
- Add a custom domain, Stripe Tax, order confirmation emails, and consider Prodigi's quote API for real shipping costs.
