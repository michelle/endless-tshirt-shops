The store is built, deployed, and verified with a real test purchase. Here is the handover.

## What I built: Orbital

A custom tee showing exactly where every planet was on a date the customer chooses. They enter a date (1800–2050), a caption, shirt colour, ink palette, Pluto on/off, and size. The site computes true heliocentric planet positions from JPL Keplerian elements and renders a minimalist diagram. Every date yields a different shirt, which plays to DTG's strength of one-off full-colour, fine-line prints with no setup cost. Sample renders are in `orbital/samples/`.

## Live store

- Store: https://temporary-sonic-agate-w4zxmnu.vercel.app
- Admin (recent Prodigi orders): URL with key is in `orbital/HANDOVER.md`

**Act first: claim the deployment.** No Vercel login was available on this machine, so I used Vercel's anonymous "temporary" deployment. It expires at 23:01 UTC today (16:01 local) unless you claim it: https://vercel.com/claim-deployment?code=20924f21-095d-4ca2-8608-28f7c8d06303

If it has expired when you read this, run the following from the project directory. It deploys a fresh URL, creates a matching Stripe webhook, and prints a new claim link.

```
./scripts/deploy-temporary.sh --fresh
```

## How to test it

1. Open the store, design a shirt, click Buy.
2. In Stripe Checkout use card 4242 4242 4242 4242, any future expiry and CVC, any US address. Untick "Save my information" to avoid the Link code prompt.
3. You land on the order page. It shows the Prodigi lab order ID and status, and auto-refreshes.
4. The admin page lists the Prodigi sandbox orders.

Verified today with Playwright: the paid session produced Prodigi order ord_1177218 via the webhook alone, and Prodigi downloaded the print file. Two abandoned, unpaid sessions created no order.

## Key design points

- **Payments:** Stripe Checkout, hosted page. Address and phone are collected there. Two flat shipping rates map to Prodigi Standard and Express.
- **Payment-gated fulfilment:** the Prodigi order is created only when Stripe reports the session as paid. The webhook does it first; the order page re-checks as a fallback for missed webhooks. Both paths are idempotent through Prodigi's merchant reference and idempotency key.
- **Print file:** a transparent PNG at Prodigi's exact print area for the Gildan 64000 (4665 by 5844 px, about 300 dpi). Lines are at least 0.75 mm wide for reliable DTG reproduction. Art URLs are HMAC-signed so the renderer cannot be abused.
- **Stripe sandbox:** I created a claimable sandbox. Claim it within 7 days via the link in `orbital/HANDOVER.md`. Keys live in `orbital/.env.local`.

## Known gaps

- The deployment and Stripe sandbox both expire unless claimed, as described above.
- Orders live only in Stripe and Prodigi. There is no database, so there is no customer account or order history page beyond the per-order link.
- No "shipped" email. Stripe sends the payment receipt. Dispatch notification needs Prodigi callbacks wired up.
- Shipping is a flat worldwide rate. Prodigi's quote endpoint could price it per country.
- Delayed payment methods (Klarna, Affirm, bank) are enabled by Stripe's defaults. The async-success event is handled, but I only tested card.
- The order page is reachable by anyone holding the long session ID. That is normal for receipts but worth knowing.

## To bring it to production

1. Claim the Vercel deployment and the Stripe sandbox, then create a live Stripe account.
2. Swap in live Stripe keys and create a live webhook endpoint for `/api/webhooks/stripe`.
3. Swap in a live Prodigi key and set the API base to production. Order one shirt to yourself and inspect the print before launch.
4. Set a permanent domain in `SITE_URL`; Prodigi fetches artwork from it days after the order.
5. Turn on Stripe Tax or price tax-inclusive, and check shipping rates against Prodigi quotes.
6. Add dispatch emails and, optionally, a database for order history.

The full architecture, local-dev instructions, and this checklist are in `orbital/README.md`, with URLs, IDs, and secrets locations in `orbital/HANDOVER.md`.
