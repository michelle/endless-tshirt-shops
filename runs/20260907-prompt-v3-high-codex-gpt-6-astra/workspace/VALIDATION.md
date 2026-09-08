# Validation record

- 11 automated tests passed, including the real transparent PNG renderer and payment/fulfillment safety cases.
- Production build and TypeScript checks passed.
- `npm audit` reported zero known vulnerabilities after removing the unused Cloudflare/Vinext runtime and applying the compatible dependency fix.
- Prodigi sandbox product lookup and US shipping quote succeeded. No unpaid order was created.
- Public production domain is registered on the run-specific Vercel project; the site, preview endpoint, and artwork endpoint are accessible without a Vercel login.
- The signed production PNG was downloaded and inspected. Its transparent print canvas is 4677 × 5881 pixels at 300 DPI, and its text uses outlined Space Grotesk.
- Invalid artwork tokens, invalid designs/quantities, and foreign-origin checkout requests are rejected.
- Missing Stripe credentials and webhook secrets produce clear setup errors without creating payments or print orders.

The current deployment HTTP checks are recorded in `smoke-results.json`. Run `python3 scripts/smoke.py` while Stripe is unconfigured to reproduce them. After connecting Stripe, use the end-to-end steps in README instead; the missing-credentials assertions will no longer apply.

## Not verified

The supplied run-specific Stripe configuration file was empty throughout this run. Real Stripe test Checkout, successful payment delivery, a real payment-triggered Prodigi sandbox order, and a physical shipment could not be verified. Provider concurrency/payment tests use mocked provider responses and do not replace this end-to-end check.

Browser interaction testing and WebMCP execution testing were not performed. The generated product photo is an illustrative mockup; a physical sample is required to validate print position, colors, garment fit, and fulfillment times.

## Final deployment

- Production deployment: `dpl_2d2kD4y85zsg2Fb6TmcnvW9H2F3F` (Vercel status READY).
- Public URL: https://benchmark-20260907-prompt-v3-high-codex-gpt-6-astra.vercel.app
- All 13 final HTTP smoke checks passed against the public URL, including content checks that prevent mistaking a login redirect for the storefront.
- The corrected final print asset was downloaded again after deployment.
