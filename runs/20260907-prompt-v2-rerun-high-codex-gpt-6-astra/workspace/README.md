# Off Hours Field Club

An original two-design t-shirt storefront built with Next.js, React, TypeScript, and the Prodigi Print API. Deployed to the run-specific Vercel project in `BENCHMARK_VERCEL_PROJECT`.

**Public store:** https://benchmark-20260907-prompt-v2-rerun-high-codex-gpt-6-astra.vercel.app

**The deployed store is a fully connected sandbox. No money is charged and no physical orders are fulfilled.** The server intentionally hard-codes `https://api.sandbox.prodigi.com/v4.0`. There is no hidden “enable live” environment switch.

## What works

- Responsive storefront, two individual product pages, original artwork, selectable sizes S–2XL, quantity controls, persistent browser bag, and mobile navigation.
- Actual Prodigi quotes for Natural Bella+Canvas 3001 shirts to US and UK destinations, shown in USD.
- Address validation, server-owned catalog/pricing/assets, encrypted expiring shipping quotes, a review step, and explicit sandbox consent.
- Simulated approve/decline payment flows. Approval sends an actual order to Prodigi sandbox; decline sends none.
- Stable provider idempotency for retries of the same checkout.
- Private receipts with real provider status, refresh, shipment/tracking data when available, copyable private links, local saved orders, and test-order cancellation.
- Accessible form labels, keyboard focus styles, skip navigation, responsive layouts, reduced-motion support, empty states, validation errors, and custom 404/error pages.
- Size, care, shipping, demo privacy, and sandbox store terms.

## Try the store

1. Open the public URL and choose either shirt.
2. Pick a size, add it to the bag, and continue to test checkout.
3. Click **Use a sample US address**, then **Get shipping rates**. You can also supply a fictional UK test address with a valid postcode.
4. Select a shipping option and **Approve test payment**. Check the sandbox agreement and place the test order.
5. On the receipt, refresh the status, copy the private order link, or cancel the test order while available.
6. To exercise failure handling, choose **Decline test payment**; it should show an error and preserve the checkout. Switch to approve to retry.
7. Refresh the bag or order page to confirm persistence. Open the private order link in another browser to verify authorized access. The order URL without its private token should not reveal an order.

There are no test card numbers because there is no payment processor connected. A payment result selector simulates that boundary. No emails are sent.

## Local development

```sh
npm ci
cp .env.example .env.local
# Fill the three values with your SANDBOX key, a random secret, and public asset origin.
npm run dev
```

The checkout needs a publicly accessible HTTPS `NEXT_PUBLIC_SITE_URL` so Prodigi can download the artwork. You can use the deployed storefront as the asset origin while testing locally. Keep that site's assets present.

Required environment variables:

| Name | Purpose |
| --- | --- |
| `PRODIGI_API_KEY` | Server-only Prodigi sandbox credential |
| `ORDER_SECRET` | Random 32+ character key for authenticated encryption and private order access signatures |
| `NEXT_PUBLIC_SITE_URL` | Canonical public HTTPS origin used for artwork URLs |

The Vercel project has these configured for the Production deployment environment. Preview environments need their own sandbox configuration. Secrets are excluded from source control and are never sent to the browser. Rotating `ORDER_SECRET` invalidates outstanding quotes and private order links.

## Validation

```sh
npm test
npm run build
node scripts/smoke.mjs https://your-public-deployment.vercel.app
```

The smoke script **creates one sandbox order** containing both designs, retries it to check idempotency, and verifies the authorization boundary. It writes a sanitized report locally and saves the private token in `/tmp/offhours-integration-private.json` (mode 0600) for follow-up checks. Never run it against an application changed to use live fulfillment.

See `TEST-REPORT.md` for results from this deployment, and `PRODUCTION.md` for the production work remaining.

## Deploy again

```sh
vercel link --yes --project "$BENCHMARK_VERCEL_PROJECT"
vercel deploy --prod --yes
```

If the long project name receives a shortened default Vercel domain, keep the explicit run-specific alias pointed to the newest deployment:

```sh
vercel alias set YOUR_NEW_DEPLOYMENT_URL "$BENCHMARK_VERCEL_PROJECT.vercel.app"
```

`vercel.json` explicitly selects the Next.js framework. The project permits public access because shoppers and Prodigi must reach the storefront and artwork. Private receipt APIs enforce their own signed access tokens.

## Artwork

Built-in image generation produced two original prints and one illustrative blank-shirt image. Print assets are `public/art/long-way.png` and `public/art/bird-club.png`; the photographic blank is `public/art/blank-shirt.png`. The exact generation prompts are preserved in `output/off-hours-assets/prompts.json`. Product previews layer the actual print over the blank photo, with a clear mockup disclosure. Next.js optimizes the storefront images; Prodigi receives the original publicly accessible PNGs.

Print files are 1122 × 1402 px with an intentional off-white rectangular background. They are suitable for exercising sandbox asset ingestion, but their resolution and physical print placement require preparation and sample approval before selling. No mockup is represented as a photo of a manufactured shirt.

## Architecture

- `lib/catalog.ts`: two designs and canonical retail prices.
- `lib/validation.ts`: accepted cart, variant, address, and checkout schemas.
- `lib/prodigi.ts`: sandbox provider client, quotes, exact SKU/size/color/front-asset mapping, idempotent order payload, sanitized receipts.
- `lib/security.ts`: encrypted quote tokens, signed order access, origin checks, bounded requests, and best-effort per-instance rate limits.
- `app/api/*`: server-only quote, ordering, receipt, cancellation, and health endpoints.
- `components/*`: shopping, checkout, and receipt interactions.

Prodigi stores fulfillment orders. Browser storage holds the bag and private order links; tab-scoped session storage keeps a recoverable checkout. There is no independent commerce database, background worker, admin account system, payment ledger, or transactional email service.
