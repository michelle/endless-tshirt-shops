# Bringing HEADLINER to production

## Must do
1. **Host it somewhere permanent.** The pilot runs on a laptop behind a
   Cloudflare quick tunnel; the URL changes whenever the tunnel restarts and
   dies if the laptop sleeps. Move to Fly.io / Railway / Render (any Node host
   with a persistent disk) or Vercel + object storage. Set `APP_URL` and
   `STRIPE_WEBHOOK_SECRET` in the host's env and drop `bin/tunnel.sh`.
2. **Real database and file storage.** Replace `server/store.js` (JSON file)
   with Postgres/SQLite, and put print PNGs in S3/R2 with public URLs that
   Prodigi can fetch. Prodigi downloads assets at order time, so they must be
   reachable for at least a few hours after ordering.
3. **Claim the Stripe sandbox, then go live.** The key in `.env` belongs to an
   unclaimed Stripe sandbox (claim URL in `~/.scratch-stripe/*.json`). Create
   a live account, swap in `sk_live_…`, create the live webhook endpoint
   (`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`) and set its signing secret.
4. **Prodigi live key.** Replace `PRODIGI_API_KEY` with a live key and set
   `PRODIGI_API_BASE=https://api.prodigi.com/v4.0`. Add a payment method and
   billing details in the Prodigi dashboard. Order a sample of each shirt
   colour to check ink colours on real fabric.
5. **Legal pages.** Terms, privacy, returns policy (DTG custom goods are
   usually non-refundable except for defects), and a contact email. Stripe
   requires a business name/URL for live mode.
6. **Taxes.** Enable Stripe Tax (`automatic_tax: { enabled: true }` in the
   Checkout session) or decide on a nexus strategy; prices are currently
   tax-exclusive and US-dollar only.

## Should do
- Email the customer when Prodigi reports `Complete`/shipped (the callback
  already updates the order record; add an email provider).
- Admin page listing orders, with "resend to Prodigi" for `fulfilment_error`.
- Rate-limit `/api/preview` and `/api/checkout`.
- Error alerting (Sentry or similar) on fulfilment failures; Stripe will retry
  the webhook for 3 days, but you want to know.
- More products: hoodie (`GLOBAL-HOOD-…`), poster of the same design, kids
  sizes. The design engine is product-agnostic; only the print area changes.
- Profanity/abuse filtering on free-text fields (Prodigi can reject jobs).
- Analytics and a share link for a design (`/api/designs/:id` already exists).

## Economics (sandbox quotes, USD)
| Layout        | Retail | Prodigi print | Prodigi ship (US/UK) | Shipping charged | Gross margin |
|---------------|-------:|--------------:|---------------------:|-----------------:|-------------:|
| Front + back  | 44.00  | 17.16         | 4.62 / 5.68          | 6.95             | ~28          |
| Front only    | 34.00  | 11.89         | 4.63 / 5.68          | 6.95             | ~23          |
Stripe fees (~3%) not included.
