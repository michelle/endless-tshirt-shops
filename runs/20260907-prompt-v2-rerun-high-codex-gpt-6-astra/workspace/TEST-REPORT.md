# Deployment verification — 7 September 2026

Store: https://benchmark-20260907-prompt-v2-rerun-high-codex-gpt-6-astra.vercel.app

Vercel project: `benchmark-20260907-prompt-v2-rerun-high-codex-gpt-6-astra`

Final deployment: `dpl_6i3kQCZUZ8Xrg3vu35djBg4nVt3D` — production target, Ready.

## Passed

- Production build and TypeScript compilation locally and on Vercel.
- Ten automated validation/security/regression tests (`npm test`).
- Twenty-two deployed HTTP integration checks in `scripts/smoke.mjs`, plus three follow-up asset and cancellation checks.
- Follow-up provider verification that both submitted artwork files downloaded successfully (`downloadAssets: Complete`, both item statuses `Ok`).
- Unauthorized cancellation rejected with 401; an earlier authorized cancellation was confirmed by Prodigi. The final order had already entered production in the sandbox, and cancellation correctly returned a handled 409 response.
- Browser JavaScript bundle scan found no Prodigi API credential.
- Current Prodigi product data includes Natural in S, M, L, XL and 2XL for both US and UK destinations.

The HTTP checks cover all primary public pages, actual PNG accessibility, custom 404 handling, invalid cart/address/price input, cross-origin rejection, real US/UK provider quotes, simulated payment decline, authenticated quote tampering, actual two-design order creation, duplicate submission, private order authorization, and sanitized order status.

Final test order: `ord_1170913`, with one Long Way M and one Bird Club L. The sandbox quote was $68 in items plus $13 in shipping, a simulated total of $81. Amount actually collected: $0. Both assets downloaded and print-ready asset preparation completed. The final order advanced to `InProgress` / `inProduction: InProgress`; a later cancellation request was unavailable and returned 409 as designed. The earlier integration order `ord_1170912` was successfully cancelled. No live Prodigi order was created.

Two provider-specific defects found during integration testing were fixed and covered by regression tests: blank optional address fields must be omitted, and duplicate order submissions return only an order ID and must be hydrated before issuing the receipt.

## Scope limits

These are real deployed API checks, not a claim of browser interaction or visual testing. Full desktop/mobile browser journeys, screen-reader testing, physical shirt samples, print-resolution approval, live payments, taxes, confirmation emails, live fulfillment, and delivery were not tested or enabled.

Sandbox order acceptance and image download do not establish physical print quality. See `PRODUCTION.md` for launch requirements.
