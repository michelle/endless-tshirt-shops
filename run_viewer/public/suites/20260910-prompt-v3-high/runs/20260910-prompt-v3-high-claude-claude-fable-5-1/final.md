The store is built, deployed, and verified end to end with a real Stripe test payment that produced a Prodigi sandbox order.

**Live store:** https://benchmark-20260910-prompt-v3-high-c-amber.vercel.app
Vercel project `benchmark-20260910-prompt-v3-high-claude-claude-fable-5-1`. Source is in the `heartwood` folder of the workspace, with a README.

## The concept: Heartwood

"Your years, drawn as rings." A tree records each year as a ring, so the shirt shows the customer's life as a wood cross-section: one ring per year lived, wider in the fast-growing early years, wobbling like real wood. Up to six milestone years ("Met Sam", "Juniper was born") become coloured rings with labels, and the name and "Est. 1988 · 39 rings" sit beneath. Seven palettes (including a full-colour Aurora that only DTG can print), three grains, eight shirt colours, XS to 3XL. Everything is generated deterministically from what the customer types, so every shirt exists exactly once. Same code renders the live preview in the browser and the 4665×5844 px, 300 dpi transparent print file on the server.

## How it works under the hood

- **Payments: Stripe Checkout.** The CLI provisioned a claimable test sandbox for you (account `acct_1UEBjdEqfnoLepfp`, expires 2026-09-17). Prices are fixed server-side, and the design is HMAC-signed into session metadata so nothing downstream trusts the client.
- **Prodigi only after payment.** The webhook verifies the signature and checks `payment_status === "paid"` before creating the Prodigi order. The order page re-runs the same idempotent fulfil function as a fallback for missed webhooks. Prodigi's `idempotencyKey` plus PaymentIntent metadata guarantee one lab order per payment. In the production test, Stripe redelivered the webhook once and the duplicate was correctly absorbed.
- **No database.** The design lives in the signed token, order state lives in Stripe and Prodigi. Prodigi downloads the print PNG from our signed `/api/print/<token>.png` URL, which I confirmed in the Vercel logs.

## How to test it

1. Open the site, click "Grow your rings", enter a birthday and a couple of moments, pick a palette and shirt.
2. Checkout with card `4242 4242 4242 4242`, any future expiry and CVC, any address.
3. You land on the order page showing the Prodigi sandbox order ID and live lab status.
4. `/api/health` reports which integrations are configured.

## Known gaps

- Stripe is an unclaimed test sandbox and Prodigi is the sandbox, so nothing is actually charged or printed.
- Flat $6.95 worldwide shipping instead of Prodigi's per-country quote, and no sales tax collection.
- No emails beyond Stripe's receipt, no admin view, no Prodigi status callback (the order page polls when loaded).
- One blank (Gildan 64000), front print only. Order pages are viewable by anyone holding the unguessable session link, showing name, city, and country only.

## To bring it to production

1. Claim the Stripe sandbox (`stripe sandbox claim`), then set a live `STRIPE_SECRET_KEY` and register a live webhook endpoint for `checkout.session.completed`, storing its secret as `STRIPE_WEBHOOK_SECRET`.
2. Get a live Prodigi key and set `PRODIGI_API_BASE` to `https://api.prodigi.com`.
3. Add a custom domain and, if it differs from Vercel's production URL, set `SITE_URL`.
4. Turn on Stripe Tax, replace flat shipping with Prodigi quotes, and add returns and privacy pages.
5. Optionally add Prodigi's callback URL with shipping-notification emails, and archive print files to Vercel Blob.
