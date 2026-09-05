Built, deployed, and verified end-to-end.

**Live:** https://benchmark-20260905-minimal-high-cla-ecru.vercel.app

## How to test it

**Buy a shirt.** Open the site, pick a cut and size, fill in a shipping address, use email `you@example.com`, card `4242 4242 4242 4242`, any future expiry, any CVC. Press Buy. You'll get a receipt with the frozen millisecond and a Prodigi order id like `ord_1170558`.

**Verify the print file** — the timestamp on the shirt is the product, so check it made it to the printer:
```bash
curl -H "X-API-Key: $PRODIGI_API_KEY" \
  https://api.sandbox.prodigi.com/v4.0/orders/<ord_id> | python3 -m json.tool
```
Look for `downloadAssets: Complete` and `asset.status: Complete`. The asset `url` is a signed `/api/artwork` link you can open in a browser — it's a transparent 3600×4800 PNG, so view it on a dark background or it looks blank.

**Check config:** `GET /api/health` reports which keys are wired up.

Test cards for the unhappy paths: `4000000000000002` (declined), `4000000000009995` (insufficient funds), `4000002500003155` (3DS challenge).

## What I verified, not just built

- Full purchase end-to-end on production: payment → Prodigi order → asset downloaded. Prodigi's stored copy of the print file has the **same MD5** as ours, so the alpha channel survives intact (its thumbnail looks blank only because JPEG flattens transparency to white).
- **Idempotency under concurrency.** I found a real bug mid-build — one payment produced *three* Prodigi orders, because the Stripe webhook and the browser's confirmation raced the metadata lock. Rebuilt the guard as a claim lease plus a "does Prodigi already have this order?" check, and moved polling to a read-only endpoint. Re-tested with 6 concurrent fulfillment attempts against a fresh paid intent: exactly one order, both on the create path and the already-exists path.
- Signed artwork URLs reject unsigned/forged requests (403); order status rejects a wrong client secret (403).

## Gaps you should know about

1. **The Stripe sandbox expires 2026-09-12.** Claim it via `stripe sandbox claim` or the store stops taking payments in a week.
2. **The sandbox key is restricted** (`rkcs_test_`). Two things are blocked on claiming it for a full key:
   - **Apple Pay doesn't appear** — the domain isn't registered (`/v1/payment_method_domains` is rejected). Google Pay and Link work.
   - **ACH and Klarna still show in the Payment Element.** I restricted the PaymentIntent to `card`/`link`, but the Element offers them anyway, and `/v1/payment_method_configurations` is rejected. Fulfillment is *correct* for these (the webhook prints when the money clears, and the receipt says "payment is still clearing"), but I'd disable ACH before going live — you don't want to ship a physical good on a debit that can fail days later.
3. **Print placement is inferred, not confirmed.** I used a 12×16in print area at 300 DPI because Prodigi's product endpoint doesn't return print-area dimensions. Order one real sample before launch and check the timestamp lands where you want on the chest.
4. **Margin is thin.** $22.50 revenue against a live Prodigi quote of $16.99–$18.35 (it varies by cut and destination) — before Stripe fees. The quote is fetched and recorded on every order in `prodigi_quote_total`, so you can watch it, but the original's price doesn't really clear at these blank costs.
5. **No admin view or refund path.** Orders live entirely in Stripe metadata; a failed print job sets `fulfillment_status: failed` and relies on webhook retries. There's no dashboard and no automatic refund if Prodigi permanently rejects an order.

## What I'd do next

Claim the sandbox, then register the payment-method domain and create a card+link-only payment method configuration — that closes gaps 2 and 3's payment half in about ten minutes. Then order one sample shirt to settle the print geometry.
