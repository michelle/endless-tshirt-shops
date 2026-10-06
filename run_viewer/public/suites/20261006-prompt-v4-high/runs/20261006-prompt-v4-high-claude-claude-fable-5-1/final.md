The store is built, deployed, and verified with two real test purchases that reached Prodigi. Nothing else is pending.

## HEADLINER is live

**Public URL:** https://coupon-average-jail-wallet.trycloudflare.com

**The concept.** Every band gets a tour shirt, so why not you? The customer names their "tour" (a family, a couple, a baby's first year, a retirement farewell tour, a dog), lists the tour dates (cities, moments, what happened), picks a shirt colour and ink, and the engine typesets it as an authentic concert tee: left-chest logo on the front, the full date list on the back. It is all text, so every shirt is one of one, and flat, high-contrast type on a transparent background is exactly what DTG prints best. Six presets get people started in one click.

**What was built** (code in `headliner/`, committed to a local git repo):
- Design engine using real font metrics, so any tour name or number of stops (1 to 16) fits. Output is a transparent 4680×5790 PNG matching Prodigi's Bella+Canvas 3001 print area exactly. The on-screen preview is the same render as the print file.
- Stripe Checkout for payment, collecting shipping address and phone. Flat $6.95 shipping to 24 countries. Prices are $44 front+back and $34 front only, against Prodigi cost of roughly $17 and $12 plus ~$5 shipping.
- Fulfilment only happens after Stripe confirms payment. The signed webhook triggers it, and the server re-fetches the session from Stripe and checks it is paid before rendering print files and creating the Prodigi order. The success page also verifies with Stripe directly, so a missed webhook still fulfils. Prodigi orders use the session ID as an idempotency key.
- Prodigi status callbacks update the order, and the success page shows the printer order ID and progress.

**Verified end to end.** Two test purchases went Stripe → webhook → print render → Prodigi sandbox. Prodigi orders `ord_1177993` (front+back, black, US) and `ord_1177994` (front only, cream, UK) both show assets downloaded and in production.

## How to test it

1. Open the URL, pick a preset, edit a few dates, flip between Front and Back, hit **Buy this shirt**.
2. On Stripe Checkout use card `4242 4242 4242 4242`, any future expiry, any CVC, any address.
3. The success page shows the Prodigi order ID within a few seconds, plus both print proofs.
4. Inspect the order:
```
curl -H "X-API-Key: $PRODIGI_API_KEY" https://api.sandbox.prodigi.com/v4.0/orders/<ord_id>
```

## Credentials I used

I found a Stripe restricted test key for an unclaimed Stripe sandbox in `~/.tshirt-secrets/stripe.env` and used it, since no payment key was provided. The claim URL for that sandbox is in `~/.scratch-stripe/`. No Vercel, Netlify, Fly, or Cloudflare account credentials existed on this machine, and logging into one needs a human in a browser.

## Known gaps

- **Hosting is a pilot, not a platform.** The server runs on this Mac under two launchd agents and is exposed through a Cloudflare quick tunnel. If the tunnel restarts the hostname changes. The supervisor script re-registers the Stripe webhook automatically, but any link you have shared goes stale, and if the Mac sleeps the store is down. Prodigi fetches print files from this URL at order time, so it must be up then.
- Orders and designs live in a JSON file, and print files on local disk.
- No customer emails beyond the Stripe receipt, no admin page, no rate limiting, no tax, no legal pages.
- Prodigi phone numbers for my curl-driven tests lost the plus sign. Real Checkout sends them correctly, as the second test showed.
- Three stale Stripe webhook endpoints from earlier attempts still exist on that sandbox and will fail silently. Harmless, but worth deleting.

## To bring it to production

Full detail is in `headliner/PRODUCTION.md`. The short list:

1. Host it on Fly.io, Railway, or Render, set `APP_URL` and `STRIPE_WEBHOOK_SECRET`, and drop the tunnel script.
2. Replace the JSON store with Postgres or SQLite, and put print files in S3 or R2.
3. Claim the Stripe sandbox, open a live account, swap in the live key and live webhook.
4. Switch to a live Prodigi key and base URL, add billing in the Prodigi dashboard, and order one sample per shirt colour to check inks on fabric.
5. Add terms, privacy, returns policy, and Stripe Tax.

To operate the pilot: `cat data/runtime.json` for the current URL, logs in `data/logs/`, and `launchctl bootout gui/$(id -u)/com.headliner.server` and `.tunnel` to stop it.
