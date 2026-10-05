# Verification record

## Build-time checks

- TypeScript compilation: passed.
- Production Vinext build: passed.
- In-memory integration tests: passed (see tests/integration.mjs). Stripe and fulfillment responses are simulated in this suite.
- Actual Prodigi sandbox API: product lookup and Standard US quote succeeded; no order was submitted without payment.
- All offered sizes checked against supplier US/natural variants: S, M, L, XL, 2XL, front 2490×3510.
- Browser: desktop layout inspected; personal place, Alpine selection, L selection and size-guide expansion verified. Mobile layout inspected at 390px.
- Local proof API: HTTP 200; valid one-page PDF, 597.6×842.4 points, vector shapes and text, transparent background. PDF rendered and visually inspected.
- Local payment configuration: disabled as expected without Stripe credentials.

## Not yet verified

- Real Stripe test checkout/webhook → actual Prodigi sandbox order.
- Prodigi download and acceptance of the paid order's asset.
- Physical print sample, delivery, returns, live payments, production tax.
