# Field Notes Club

A personalized “personal park” t-shirt shop. Customers choose a place, people, year, motto, palette, and size. The exact rendered design appears in the preview and is sent to the printer after verified payment.

**Deployed store:** https://benchmark-20260907-prompt-v3-rerun-high-codex-gpt-6-astra.vercel.app

**Vercel project:** `benchmark-20260907-prompt-v3-rerun-high-codex-gpt-6-astra`

## Current status

The storefront and server integration are deployed. Prodigi sandbox authentication, product variants, and a US shipping quote were verified against the actual API. Ten automated commerce and rendering tests pass. The final artwork was visually inspected.

**Payments are not yet operational:** `BENCHMARK_STRIPE_CONFIG` points to an empty file, and no Stripe secret key was supplied. The deployed checkout therefore returns an explicit setup message. No payment was taken and no Prodigi order was submitted. A real Stripe Checkout → paid webhook → Prodigi sandbox order has not been tested. Do not describe this deployment as a fully operational store until that test passes.

## Enable and test payments

1. Supply a Stripe **test** secret key as `STRIPE_SECRET_KEY` in the shell, in `.env.local`, or in the file referenced by `BENCHMARK_STRIPE_CONFIG`. Never commit or share credentials.
2. From this project directory, run:

   ```sh
   node scripts/configure-stripe.mjs
   vercel --prod --yes
   ```

   The setup script creates the Stripe test webhook at `/api/webhooks/stripe`, saves its signing secret privately, and configures the Vercel production environment with both Stripe credentials. Here, “production environment” means Vercel’s public deployment; the store remains in **test payment and sandbox fulfillment mode**. If the endpoint already exists, its existing signing secret must be supplied. The script does not delete existing endpoints.

3. Open the store, change every personalization field, switch palettes and preview modes, choose a size, and review the design. The design persists on this device. Checkout collects billing, email, phone, and a US shipping address.
4. Pay with Stripe test card `4242 4242 4242 4242`, a future expiry, any three-digit CVC, and valid-format US address details. This is Stripe test mode, so there is no real charge.
5. Confirm the order page says payment confirmed and shows a Prodigi `ord_...` reference. Inspect the same order in the Prodigi **sandbox** dashboard; confirm the design asset downloaded, shirt size, white color, front print area, and recipient match.
6. Refresh the order page and resend the same event in Stripe’s webhook dashboard. Both must retain the **same** Prodigi order ID. Prodigi’s persistent idempotency key prevents duplicate print orders even if concurrent webhook attempts happen before Stripe metadata is updated.
7. Test canceling checkout and the decline card `4000 0000 0000 0002`; no order should reach Prodigi. Stripe’s test events that contain unrelated sessions are not sufficient: test through this store’s Checkout so the stored design, shipping address, and payment amount exist.

The [Stripe fulfillment guide](https://docs.stripe.com/checkout/fulfillment) describes the webhook and return-page fulfillment flow used here. [Stripe test cards](https://docs.stripe.com/testing) document test payment behavior.

## Validation and local development

```sh
npm ci
npm test
npm run build
node scripts/verify-deployment.mjs https://benchmark-20260907-prompt-v3-rerun-high-codex-gpt-6-astra.vercel.app
```

For local development, copy `.env.example` to `.env.local` only if no local environment already exists. Set `APP_URL=http://localhost:3000`, supply secrets, and run `npm run dev`. Forward Stripe test events with the Stripe CLI to `localhost:3000/api/webhooks/stripe` and use that listener’s signing secret locally. Production uses its separate registered webhook signing secret.

Automated checks cover unpaid-order rejection, payment amount/currency/store/mode validation, shipping restrictions, a stable provider idempotency key for concurrent calls, already fulfilled orders, provider failure behavior, malformed designs, signed artwork integrity, forged webhook rejection, and full-resolution rendering. Mocked provider tests verify application behavior; they do not replace the missing real payment/fulfillment test. Browser interaction and optional WebMCP tool execution were not exercised in a browser.

The deployed smoke-check script checks public availability, image rendering, forged-art rejection, webhook rejection, cross-origin checkout rejection, and the missing-configuration checkout state. Product and quote evidence is in `docs/prodigi-verification.json`.

## Payment and fulfillment design

- `POST /api/checkout` validates a strict design schema and current Prodigi quote. Price and product are controlled on the server: one $38 tee plus $6 US shipping, $44 total. No client amount or arbitrary asset URL is accepted.
- Stripe Checkout is hosted by Stripe, so card data never enters this application. The design is stored in Checkout Session metadata. Stripe is the durable payment/order record; there is no separate application database.
- `POST /api/webhooks/stripe` validates the signature against the unmodified request body. Both supported success event types call the same fulfillment function as the return page.
- Fulfillment **retrieves the session again from Stripe** and requires `payment_status=paid`, $44 USD, the store metadata identifier, matching test/live mode, and a US shipping address. It then submits to Prodigi with `idempotencyKey=field-notes-v1-<session-id>`.
- The Prodigi order ID is written to Stripe metadata. Failed requests return an error so Stripe can retry. If Prodigi accepted an order but the response or metadata write failed, the next submission uses the same key; Prodigi returns the existing order. Its [API reference](https://www.prodigi.com/print-api/docs/reference/) specifies that these keys are retained indefinitely.
- Full-resolution artwork is served from a signed, reproducible URL. The PNG is 4,677 × 5,881 pixels with 300 DPI metadata. Customer text is converted to vector glyph paths before rasterization, avoiding dependence on fonts installed in the server environment. The preview uses the same renderer at 600 pixels wide.
- Keep the artwork secret and original assets stable. Existing signed URLs depend on them. Version the rendering route and assets before changing old print designs; do not overwrite historical assets or rotate the secret without migration.
- The order-status link uses the unguessable Stripe session ID as its access token. Treat it as a private receipt. No address or email is returned by the status API. A no-referrer header reduces accidental sharing through outbound links.

## Before accepting real orders

1. Finish the real Stripe test checkout and Prodigi sandbox order test above, including provider asset download and duplicate-event replay. Order and inspect a physical sample separately before opening sales. The generated landscape is upscaled to the output dimensions; full canvas resolution does not mean every image detail originated at 300 DPI. Mockup placement and lab-specific print sizing need sample approval.
2. Activate the merchant’s Stripe account, payout details, and live API credentials. Configure a **live** webhook at the canonical domain and supply its signing secret. Activate and fund Prodigi’s live account and use its **live** key.
3. Set the canonical custom domain and `APP_URL`, make the storefront, webhook, and signed artwork route publicly reachable, and update the webhook registration. A Vercel login wall will prevent Stripe callbacks and Prodigi downloads.
4. Implement the merchant’s sales-tax configuration, then update the fixed-total validation to accommodate a server-calculated tax amount. Current test checkout has no customer sales tax calculation. Verify actual destination-specific production costs, shipping coverage, delivery promises, and margin. The sandbox quote’s $15.57 cost is indicative, excludes possible sales tax, and is not a live price guarantee.
5. Publish the merchant identity, monitored support contact, privacy/retention terms, return/reprint policy, and customer terms. The current site explicitly identifies itself as a sandbox and does not invent those business details. Enable Stripe receipt emails and add shipping notifications if desired.
6. Add operational alerts and regular reconciliation for paid sessions missing a Prodigi order, orders with issues, exhausted webhook retries, refunds, and cancellations. Refunds do not automatically cancel printing in this implementation. Manage them in Stripe and Prodigi with awareness of the production stage. There is no custom admin dashboard, email notification service, or tracking-link UI; the order page shows the provider’s current stage.
7. Apply rate limits/bot protection to the public preview and checkout APIs, and review access and retention as traffic grows. Browser-test desktop/mobile checkout and the supported character limits before launch. Current scope is one white tee per checkout, sizes S–2XL, US shipping, and English-letter personalization.
8. Only after those steps, set `STORE_MODE=live`, `PRODIGI_MODE=live`, `LIVE_CHECKOUT_ENABLED=true`, and the matching live Stripe and Prodigi credentials, then redeploy. The application rejects mixed test/live configurations. These flags are a deliberate final launch gate, not a substitute for the business and tax setup above.

## Original assets

Both images were created with the built-in imagegen tool. Saved project assets are `public/assets/landscape.png` and `public/assets/blank-shirt.png`. Font license files are adjacent to the bundled fonts. Prompts and asset provenance are in `docs/assets.md`.
