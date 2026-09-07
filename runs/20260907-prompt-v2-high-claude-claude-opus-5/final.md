The store is built, deployed, and verified end to end.

## 🔗 Live: https://benchmark-20260907-prompt-v2-high-c-nu.vercel.app

**LAST SHIFT — apparel for jobs that no longer exist.** Six union-style crests for extinct trades: the Knocker-Upper (the human alarm clock, *"Sleep Is Not An Excuse"*), the Lamplighter, the Switchboard Operator, the Ice Cutter (*"We Sold Winter In July"*), the Human Computer, and the Log Driver. Every crest is original SVG I drew for this store — a monoline badge with arc-set trade name, the years it was worked, and the motto it earned. Each exists in two inks (cream for dark garments, near-black for light), so the shirt colour you pick selects which print file goes to Prodigi.

## How to test it

1. Browse the register, open any shirt, switch colours and click **Crest** to see the artwork full-size.
2. Add to cart, hit **Checkout**, pay with `4242 4242 4242 4242`, any future expiry, any CVC. Pick "Card" as the payment method, and untick "Save my information".
3. The confirmation page shows the live Prodigi print-order ID and production stage.
4. `GET /api/health` reports which integrations are wired up.
5. `GET /api/reconcile?key=<CRON_SECRET>` (secret is in `.stripe-keys`) sweeps recent paid sessions and reports any missing print orders.

I ran 8 real purchases through the deployed site. Prodigi received exactly one order per session (verified: 8 orders, 8 distinct sessions, zero duplicates), downloaded the 4665×5844 print files successfully, and the 2XL surcharge, per-colour ink selection and server-side pricing all held (a client sending `price: 1` still got charged $36).

## Two real bugs I found and fixed

- **Prodigi does not dedupe.** I tested it: two POSTs with the same `merchantReference` *and* an idempotency header create two orders. The webhook and the confirmation page could both fulfil. Fixed with a claim marker on the Stripe session metadata plus a single-writer rule, measured from payment time rather than session creation.
- **Prodigi's create-order call takes ~8.5s**, which pushed the whole chain past Stripe's ~20s webhook timeout — orders were being created while Stripe marked delivery failed. The webhook now verifies the signature, acknowledges immediately, and fulfils in `after()`. Delivery went from permanently pending to clean.

## Gaps you should know about

- **Everything is in test/sandbox mode. No shirt will actually be printed or shipped.** Prodigi is on the sandbox key; Stripe is a sandbox account.
- **The Stripe sandbox expires 2026-09-14.** It's unclaimed — claim it at the URL in `.stripe-keys` or payments stop working in a week. Its key is restricted (`rkcs_test_`), so some Stripe endpoints reject it.
- No tax handling. Stripe Tax is off and duties are DDU — the customer pays them on delivery. The store says so, but it hurts international conversion.
- No transactional email beyond Stripe's receipt: no branded confirmation, and Prodigi's shipping/tracking webhooks aren't wired, so nobody gets a tracking number.
- No database. The Stripe session *is* the order record. That works, but there's no order-lookup page, no accounts, no admin view.
- Refunding in Stripe does not cancel the Prodigi order — that's manual today.
- Mock-ups are illustrated (accurate flat-lay geometry, not photos). Real photography converts better.
- No terms/privacy/returns pages, which Stripe requires before live mode.
- The reconcile cron runs daily (Hobby-plan limit); on Pro, tighten it to hourly.

## To go to production

1. Claim the Stripe sandbox, switch to live keys, re-register the webhook against the live endpoint.
2. Get a live Prodigi account with billing, swap `PRODIGI_API_KEY`, and **order one of each shirt yourself** — print placement and ink density on real fabric is the one thing I could not verify.
3. Point a real domain at the project and set `SITE_ORIGIN` to it (Prodigi fetches print files from that origin, so it must stay public).
4. Add legal pages, Stripe Tax, and order-status emails driven off Prodigi's callbacks.
5. Re-check margins: landed cost is $15.58 against a $36 price, before payment fees, returns and duties.
