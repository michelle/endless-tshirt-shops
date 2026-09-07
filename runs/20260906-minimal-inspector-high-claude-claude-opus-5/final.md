Built, deployed, and verified end to end.

**Live:** https://benchmark-20260906-minimal-inspecto-mu.vercel.app
(Vercel project `benchmark-20260906-minimal-inspector-high-claude-claude-opus-5`. The long `<project>.vercel.app` hostname doesn't resolve — that short alias is the production domain.)

## How to test it

**Buy a shirt.** Pick a cut and size, enter an email and US address, pay with `4242 4242 4242 4242`, any future expiry, any CVC. The counter on the shirt freezes the moment you press buy — that millisecond is what gets printed. You'll get back a Stripe order ref, a Prodigi printer reference, and a "view" link to the actual print file.

**Check the artifacts:**
- `/api/artwork/<timestamp>.png` — the real 300 DPI print file (4680×5790). Add `?dpi=72&bg=17181a` to preview it. It's white-on-transparent, so on a white background it looks blank; the `bg` param is there for that.
- `/api/status` — config self-check (reports presence of keys, never values).
- `/api/orders/<pi_id>?client_secret=<secret>` — live order status, pulling the current stage and tracking number from Prodigi.
- `/api/og` — social card, rendered with the current millisecond.

**Failure paths worth trying:** card `4000000000000002` declines cleanly and keeps your timestamp with a "release it" option.

**What I verified in production**, not just locally: a full browser purchase with no console errors; Prodigi downloaded the print file from the public artwork URL and drove a sandbox order all the way to `Complete` with a tracking number; the Stripe webhook and the browser's settle call raced on one order and produced exactly one Prodigi job (one order per PaymentIntent across all 14 test orders); and a forced Prodigi rejection after authorisation voided the payment (`canceled`, `amount_received: 0`) instead of keeping the money.

## What you need to do next

1. **Claim the Stripe sandbox before 2026-09-14** — I created a claimable one via `stripe sandbox create`. The claim URL is in `.stripe-keys.env` in the workspace (gitignored, along with the keys and the webhook secret). If it isn't claimed, checkout stops working when it expires.
2. **Turn off Klarna / ACH / Cash App** in the Stripe dashboard's payment-method settings once claimed. Not urgent — see the gap below.
3. If you want a real domain, add it in Vercel; `NEXT_PUBLIC_SITE_URL` overrides the origin used for artwork URLs handed to Prodigi.

## Gaps I know about

- **Stripe's Payment Element renders every method enabled on the account** — Klarna, ACH — even on a `payment_method_types: ['card']` intent, and every documented Elements-level restriction (`paymentMethodTypes`, `allowedPaymentMethodTypes`, `excludedPaymentMethodTypes`) was silently ignored; I confirmed this against a bare element, so it isn't my integration. The dashboard toggle is the only real control, and the claimable-sandbox key can't reach `/v1/payment_method_configurations`. So the card field is a **Card Element** with `confirmCardPayment` — one card row, nothing that can't be charged. It also happens to match the original store's single "Card details" field.
- **Apple Pay / Google Pay are wired up but untested.** The Express Checkout Element is mounted and handles freeze → prepare → confirm, but it renders nothing in headless Chrome, so it has never actually run. Apple Pay additionally needs the domain registered with Stripe.
- **A draft PaymentIntent is opened on every page load.** That's what makes the element derive from a real intent; abandoned drafts sit in `requires_payment_method` and cost nothing, but they'll clutter the dashboard.
- **US shipping only, one shirt per order, no cart** — deliberate, matching the original.
- **No database.** The PaymentIntent *is* the order record and artwork is a pure function of the timestamp, so nothing is stored. The trade-off: a customer who closes the tab can't look their order up again — the client secret is the only key.
- **Rate limiting is per-lambda-instance in memory**, which is close to useless across a fleet. Real abuse protection needs an edge limiter.
- Test-mode Stripe receipts don't send unless enabled in the dashboard, so "a receipt is on its way" is currently aspirational.
- The Prodigi callback endpoint fires and works, but it writes a `prodigi_stage` to metadata that can lag; the order status endpoint re-reads from Prodigi live, so what you see is always current.
