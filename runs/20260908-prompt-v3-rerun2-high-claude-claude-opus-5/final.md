Done. Everything is deployed and verified end to end.

## The store

**https://benchmark-20260908-prompt-v3-rerun2-pi.vercel.app**

**The Isle of You** — you answer six questions and the press engraves an antique sea chart of the island you turn out to be: `THE ISLE OF <name>`, `Port <hometown>`, `Mount <what you chase>`, `<where you feel safest> Bay`, `The <where your hours go> Wilds`, and `HERE BE <what you avoid>` beside a sea serpent. The coastline, relief contours, forests, soundings, plate number and coordinates are all derived deterministically from your answers, so the chart is genuinely one-of-one — which is exactly the thing DTG can do that screen printing can't. $48, Gildan 64000, eight colourways, two-ink palette that swaps for light vs. dark cloth.

The same TypeScript engraver draws the live browser preview and the 3120×3860 transparent print PNG, so what you see is what gets printed.

## How to test it

1. Open the site, fill in the six questions — the island redraws as you type.
2. Pick a colour and size, click **Commission this chart**.
3. Pay with Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC.
4. You land on a live order page showing the Prodigi order id and production stage.

Your Stripe sandbox: `acct_1UDMG0K4xkjAXEFO`. **It expires 2026-09-15** — claim it at the URL in `stripe sandbox claim` before then or you lose the test data.

Source is in `.../benchmark-workspace.0FnTKd/isle`, with a README covering architecture and gaps.

## What I verified against the real services

Full browser purchases through hosted Stripe Checkout → webhook → Prodigi. The most recent, `ord_1171090`: correct recipient, forest green, size L, and asset status `Complete`, meaning Prodigi actually downloaded and validated our print file. Also confirmed: an unpaid session creates zero Prodigi orders; forged webhook signatures get 400; unsigned print-file URLs get 403; non-Latin input is rejected before checkout (the engraving font would print empty boxes).

## Two things I found and fixed

**Prodigi has no idempotency.** It accepts an `Idempotency-Key` header and a `?merchantReference=` filter and honours *neither* — I posted the same order twice with the same key and got two orders. My original double-print protection was therefore imaginary. Now: the PaymentIntent records the Prodigi order id, `createOrder()` scans Prodigi's 50 most recent orders for the Stripe session id before creating, and the order page won't fulfil a session younger than 90 seconds so it can't race the webhook. I verified this by wiping the PaymentIntent marker and replaying a signed webhook — it found the existing order and printed nothing new.

**The order page and webhook were racing.** The buyer lands on the order page at almost exactly the moment the webhook fires; both would have created an order. That's what the 90-second grace period fixes.

## Gaps you should know about

- **No database.** Two *simultaneous* fulfilment attempts could still both slip through. The real fix is an orders table with a unique constraint on the session id, claimed transactionally. The 50-order scan window is also finite at volume.
- **Latin-only engraving.** IM Fell has no CJK/Cyrillic/Arabic. Rejected at input rather than printed as boxes, but that blocks customers in markets you ship to (JP is in the allowed list).
- **No tax collection.** Prodigi charges VAT on EU/UK fulfilment ($3–5/shirt); margins absorb it, but you need registration and Stripe Tax before selling there at volume.
- **Express shipping priced thin** — $14 charged against $22–45 cost. Never loss-making, but express to Japan nets ~$17 vs $32 for standard.
- **No email of our own, no admin view.** Stripe's receipt only; refunds don't cancel the Prodigi order.
- **The mockup is an approximation.** Real DTG on dark cotton uses a white underbase and prints bolder.

## To go to production

Swap `PRODIGI_BASE_URL` to `api.prodigi.com` and the Stripe keys to live (recreate the webhook endpoint — the secret differs), then **order physical samples on every colourway before taking a single real order**; the two-ink palette on dark garments is the thing most likely to disappoint in the cloth. After that: add the orders table, wire Prodigi status callbacks to shipping emails, enable Stripe Tax, and put a real domain on it.
