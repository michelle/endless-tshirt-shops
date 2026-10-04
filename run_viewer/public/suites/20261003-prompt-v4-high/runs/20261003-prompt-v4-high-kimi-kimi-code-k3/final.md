The store is built, deployed, and verified end-to-end with a real test purchase.

# Under This Sky — personalized star map tees

**The concept:** DTG means every shirt can be different, so every shirt *is* different. The customer picks a date, time, and place, and we compute the actual night sky for that moment — 1,018 stars from the Yale bright-star catalog projected for those exact coordinates, tinted by each star's real spectral color, plus the true moon phase drawn where the moon actually stood — plus a personal caption. Printed chest-front on a Gildan 64000 in black, navy, or charcoal.

**Live store:** https://temporary-quick-bassoon-oxdmekd.vercel.app
**Code:** `store/` in the workspace (README has architecture details)

Verified working (headless-browser E2E, `store/scripts/e2e.js`, run twice): browse → live preview → Stripe Checkout payment with `4242 4242 4242 4242` → signature-verified webhook → Prodigi sandbox order (`ord_1176929`, `ord_1176930`) → Prodigi downloaded the signed 4665×5844 @300dpi transparent print file. Shirts go to Prodigi **only** after `payment_status === 'paid'`.

## Important: two things expire soon

1. **The Vercel URL expires ~09:07 UTC today** (60-min anonymous deploys). Keep it by claiming it (free Vercel account): https://vercel.com/claim-deployment?code=0b519163-067a-4072-aad8-84bc79d5df95
2. **The Stripe sandbox expires 2026-10-11** (7-day unclaimed sandbox). Claim it: https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVU1jeUdCSVcxQVRicVZnLDE3OTE3MDM1MDYv1008Ap21wAl

## How to test it yourself

1. Open the store URL, pick a date/place/caption, watch the live preview, choose size/color.
2. Click "Make mine" → pay on Stripe Checkout with card `4242 4242 4242 4242`, any future expiry, any CVC. Phone field is required (any valid-format number).
3. You'll land on the success page showing "sent to print ✓" and your design. I can look up the Prodigi order by your Stripe session id (`cs_test_…`) if you want to see it in the sandbox.

## Known gaps

- **Prodigi is in sandbox** — orders are accepted and processed but never physically printed or shipped.
- **Order records are in-memory** (per serverless instance). Fulfillment itself is safe (idempotent Prodigi key = Stripe session id; the success page can also trigger fulfillment lazily after verifying payment), but there's no durable order history or admin view.
- **Timezone is approximated** from longitude (±30 min worst case) rather than a real tz database.
- **No taxes/shipping fees** — flat $38 with "free shipping"; Prodigi's per-order cost isn't passed through.
- No rate limiting/bot protection on the checkout endpoint; no email confirmation beyond what Stripe sends; no size 4XL/5XL offered though the blank supports it.

## To take it to production

1. Claim both sandboxes above (or substitute your own Vercel account + real Stripe account).
2. Swap keys: live Stripe secret, create a live webhook endpoint for `/api/webhook` (`checkout.session.completed`), set `STRIPE_WEBHOOK_SECRET`, and use your **live Prodigi API key** with `PRODIGI_BASE=https://api.prodigi.com/v4.0` — then orders really print and ship.
3. Add a database (Postgres/Redis) for order records; the `lib/store.js` interface is the single place to swap.
4. Add Stripe automatic tax + a shipping-fee model (Prodigi's `/quotes` endpoint gives per-order costs), and a custom domain.
