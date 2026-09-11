The store is built, deployed, and verified with real test purchases end to end.

**Live store:** https://benchmark-20260911-prompt-v3-high-c-lac.vercel.app

## The concept: Sidereal

Every shirt is generated for one customer. They name a place, a date and a time, and the app computes the actual night sky overhead at that instant from the Yale Bright Star Catalogue. It renders the stars in their true colours by B-V index, constellation figures, cardinal points, and the customer's caption, then prints that at full print-area resolution. DTG is what makes this viable: thousands of individually tinted dots and a one-off file per order, with no minimums.

**Stack:** Next.js 16 on Vercel, Stripe Checkout with signed webhooks, Prodigi Print API (sandbox), Vercel Blob for order records and print files, and resvg for server-side rendering with bundled fonts.

## How to test it

1. Open the store, click "Chart your sky", search a place, set a date and time, pick a style, colour, and size.
2. Click Checkout. Use Stripe test card `4242 4242 4242 4242`, any future expiry and CVC, and a US or EU address.
3. You will land on the order page, which shows the print file sent to Prodigi and polls Prodigi for live status.
4. Admin view of all orders, with retry: https://benchmark-20260911-prompt-v3-high-c-lac.vercel.app/admin?token=31c83f877b09a6430b37011202e36f60
5. Run a headless purchase yourself from the project directory:

```bash
node scripts/e2e-checkout.mjs https://benchmark-20260911-prompt-v3-high-c-lac.vercel.app
```

I ran that script five times. Each produced a paid Stripe session and one Prodigi sandbox order (ord_1171670 through ord_1171674) with the correct SKU, colour, size, recipient, and print asset.

## How payment gates printing

The design is encoded into Stripe Checkout metadata. Only the webhook for a session with `payment_status: paid` triggers fulfilment, which renders the print file, stores it, and creates the Prodigi order. The Stripe session id is Prodigi's idempotency key, so the success-page fallback, webhook retries, and admin retries can never double-print. I confirmed Prodigi returns "AlreadyExists" on a duplicate key.

## Known gaps

- **Stripe sandbox is unclaimed and expires 2026-09-18.** Claim it here before then: https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVUVUdzBFNjlEQ0lnajJtLDE3ODk3NTcwMTUv100a5Nrczvx
- **Order records are in a public Blob store** at unguessable paths. They hold email and name but no street address. Move to a private store or a database before live.
- **No Sun, Moon, or planets** on the chart, and star positions ignore precession and refraction. Fine for a keepsake, but worth stating in copy.
- **Shipping rates are flat** ($5.95 and $14.95) and not tied to Prodigi's real quotes or tax. Prices are USD only.
- **No customer emails** beyond Stripe's receipt. Shipping notifications would need a Prodigi callback plus an email provider.
- **Geocoding uses Open-Meteo's free API** with no key. Acceptable for a demo; consider a paid provider for scale.
- The Stripe restricted key from the sandbox expires 2026-12-10.

## To bring it to production

1. Claim the Stripe sandbox, then create a live account, set live `STRIPE_SECRET_KEY`, create a live webhook endpoint for `checkout.session.completed`, and set its `STRIPE_WEBHOOK_SECRET`.
2. Get a production Prodigi key and set `PRODIGI_API_URL` to `https://api.prodigi.com`. Order a real sample first to check print density of the small stars on dark garments.
3. Add a custom domain and update `SITE_URL`.
4. Switch order storage to a private Blob store or Postgres, and add a privacy policy and terms.
5. Replace flat shipping with Prodigi's quote endpoint and add tax collection.

Code is committed in the project at `sidereal/` inside the workspace, with a README covering setup and environment variables.
