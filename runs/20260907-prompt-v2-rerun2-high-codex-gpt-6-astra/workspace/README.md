# Amateur Weather Club

Original outdoor graphic t-shirt store with a working **sandbox** checkout, deployed to the run-specific Vercel project specified by `BENCHMARK_VERCEL_PROJECT`.

Public URL: https://amateur-weather-club-20260907-r2-astra-7f4c.vercel.app

## What works

- Two original designs on verified Prodigi Gildan 64000 SKUs: black / A Little Rain and navy / Head in the Clouds, sizes S–2XL, USD 32 each.
- Product details, manufacturer size guide, accessible modal and size controls, persistent browser bag, quantities and removal.
- Delivery form, server-calculated retail prices, live sandbox shipping quotes for US, GB, CA, AU; a signed quote expires in 20 minutes.
- Real sandbox order creation with publicly downloadable original print assets. Server-side validation, constrained catalog, bounded quantities, request origin check, provider timeouts, and Prodigi-backed idempotency.
- Signed private receipt links, provider-backed fulfillment status, and latest receipt retained in the browser. No delivery address is exposed by the status endpoint.
- Secrets only in server environment variables. The provider endpoint is intentionally hardcoded to sandbox. No card information is collected, no payment is taken, and no physical order is fulfilled.

The Sites scaffold was adapted to Next.js for the explicitly requested Vercel deployment. Unused Worker runtime packages were removed to resolve their security advisories. Prodigi is the durable system of record for this sandbox; there is no separate orders database.

## Try it

1. Choose either design and a size, then add it to the bag. Change quantity, remove, or reload to check bag persistence.
2. Continue to test checkout. Use fictitious details, for example Alex Sandbox, alex@example.com, 123 Test Street, Portland, OR, 97205, United States.
3. Calculate shipping. Review shirts, shipping, test total, and $0 charged today.
4. Place the sandbox order. Save the private order-status link and refresh fulfillment status.
5. Find the same order in your Prodigi sandbox dashboard at https://sandbox-beta-dashboard.pwinty.com using its `AWC-…` merchant reference or `ord_…` identifier.

Sandbox shipping prices are test quotes, not launch-ready customer tax or delivery promises. Orders may be held or flagged according to the merchant sandbox configuration.

Validation: 33 HTTP checks passed on the public deployment, including two sandbox orders and duplicate retries. Both earlier test orders completed artwork downloads. See `docs/validation.md`.

## Local development and checks

Use Node 22.x. Copy `.env.example` to `.env.local` and fill the values from your secret manager. `SITE_URL` must be a publicly accessible HTTPS deployment for Prodigi to retrieve the artwork, even during local order tests.

```
npm ci
npm run dev
npm run typecheck
npm run build
TEST_URL=http://127.0.0.1:3000 npm test
```

Use the actual local port printed by Next.js (3001 was used during this run). `npm test` is an HTTP integration suite and **creates two sandbox orders**, checks duplicate idempotency, both artwork mappings, shipping, input rejection, price tampering, receipt privacy, and public asset responses. It never contacts the live Prodigi endpoint. Set `TEST_REPORT` to an ignored absolute path to retain order receipts; treat those receipt capabilities as private.

Browser screenshot and interaction QA was not performed. Before launch, test keyboard use, mobile layouts, all checkout actions, reloads, and network failures in real browsers.

## Deploy

The existing `.vercel/project.json` points at this run's project and is intentionally ignored by Git. Link with `vercel link --project "$BENCHMARK_VERCEL_PROJECT"` if needed. Configure `PRODIGI_API_KEY`, `ORDER_SIGNING_SECRET`, and `SITE_URL` in the Vercel production environment, then `vercel deploy --prod`. Keep the stable public domain associated with the newest deployment; Prodigi must fetch the print files without login. Do not rotate `ORDER_SIGNING_SECRET` without a receipt migration plan: existing signed links rely on it.

## Before production

1. **Payments and order durability:** add a payment provider such as Stripe, an application database, verified payment webhooks, an idempotent fulfillment job/queue, retry and reconciliation logic, and refund handling. Only submit to Prodigi after verified successful payment. The current endpoint is deliberately sandbox-only; replacing the API key alone does not enable real sales.
2. **Fulfillment:** provision a live Prodigi account/key and billing, approve physical samples, map the live variants, verify country availability and shipping services, then enable live submission behind the paid-order workflow. Add callbacks or scheduled reconciliation, authenticated order history, customer emails, and operational alerts.
3. **Print readiness:** the two supplied transparent PNG artworks are 1024×1536 with textured partial transparency. Prodigi can download them, but they are not approved full-size production masters. Prepare final artwork at each selected print-area resolution (product data returned approximately 2490×3510 to 4677×5881 for some variants), inspect transparency and placement, order samples, and replace the illustrative campaign photograph with accurate photos/mockups of the sold designs. Do not simply upscale and assume new detail.
4. **Commercial setup:** configure customer tax calculation, pricing/margins including fulfillment tax and shipping, supported markets, realistic production/transit estimates, support email, privacy/retention terms, returns/refunds and cancellation policies. Establish these with appropriate business/legal advice for your markets.
5. **Operations/security:** add distributed abuse/rate controls, bot protection, observability, alerting, backups, secret rotation processes and admin authentication. The current origin check and quantity limits are not comprehensive bot protection. Test timeout/retry recovery and payment/fulfillment failure cases. Add a Content Security Policy suited to the eventual payment integration.
6. **Launch:** attach your domain, update SITE_URL, remove sandbox wording only after live acceptance tests, and remove the deliberate search-engine `noindex` setting. Do not advertise the site as live while it still has sandbox checkout.

## Artwork

Created using the built-in imagegen tool. Exact final prompts are preserved in `docs/artwork-prompts.json`. Print assets: `public/art/rain.png`, `public/art/clouds.png`; illustrative campaign image: `public/art/campaign.png`. The campaign image is labeled illustrative in the storefront because it is not an exact product mockup. Displayed individual print artwork is the exact file sent to Prodigi.

## References

- Prodigi API: https://www.prodigi.com/print-api/docs/reference/
- Product specifications and size chart: https://www.prodigi.com/products/mens-clothing/t-shirts/classic/gildan-64000/
