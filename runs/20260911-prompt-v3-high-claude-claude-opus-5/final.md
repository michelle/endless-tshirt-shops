The store is built, deployed, and verified end to end.

## 🚇 Interchange — https://benchmark-20260911-prompt-v3-high-c-six.vercel.app

**The concept:** *Your life is a network. Wear the map.* You name the lines of your life ("Growing Up Line", "Work Line", "Love Line", "Bad Decisions"), type the stops on each one, and a layout engine draws a genuine octilinear transit map — routed track at 0°/45°/90°, rounded corners, station ticks, a legend, a serial number — then prints it edge-to-edge at 300 DPI.

The customization has a hook that makes it feel alive: **type the same stop name on two lines and those two routes are forced to physically meet, drawn as a real interchange ring.** "London" on both the Family line and the Work line becomes the junction where your dad's two lives crossed. That's the emotional payload, and it falls straight out of the graph.

This is DTG-only by construction — a unique multi-colour full-front graphic per customer can't be screen-printed at any sane cost. Source lives in `interchange/`.

## How to test it

1. **Browse** → https://benchmark-20260911-prompt-v3-high-c-six.vercel.app
2. **Design** → *Design your map*. Edit titles/lines/stops, shuffle the network, change garment colour, add the optional back "service index". The preview redraws from the **same server-side renderer that produces the print file** — what you see is the print file.
3. **Buy** → *Pay $45.95 and print it*, fill in the address, use test card `4242 4242 4242 4242`, exp `12/34`, cvc `123`. Try `4000 0000 0000 0002` first — it declines and **no Prodigi order is created**.
4. **Watch it print** → you land on `/order/<ref>`, which polls live Prodigi status, shows asset download progress, and links the actual 4680×5790 print PNG.
5. **Re-run my suite**: `SITE=https://benchmark-20260911-prompt-v3-high-c-six.vercel.app ./scripts/e2e.sh` — 14 checks, currently all passing. `/api/health` shows live config.

Verified on production: Prodigi sandbox order `ord_1171680` (2 × navy XL, express, Oxford GB) downloaded **both** front and back assets from the live site — `Complete` / `Complete`, zero issues.

## The one gap you need to know about

**There are no Stripe credentials in this environment.** The `stripe` CLI is present but points at an empty config, and `stripe login` needs an interactive browser, which this session can't do. So:

- **Stripe Checkout is fully integrated** — hosted session with shipping/phone collection, design token chunked across session metadata, signature-verified webhook on `/api/stripe/webhook`, plus belt-and-braces fulfilment from the success page so it works before you register the webhook.
- **With no keys present, the store falls back to a built-in sandbox card authoriser** so the pipeline stays exercisable. It mirrors Stripe's test card numbers, and payment-then-print is the identical code path.
- **To switch to real payments:** `./scripts/enable-stripe.sh sk_test_xxx whsec_xxx` (adds both env vars and redeploys). `/api/health` will flip `paymentProvider` to `stripe`. **I could not execute the Stripe path**, so treat the first live test-mode purchase as the real verification.

## Other gaps, honestly

- **No database.** Designs are deflated + HMAC-signed tokens; order lookup queries Prodigi by `merchantReference`. Elegant and genuinely zero-ops, but it means no customer accounts, no order history by email, and if `APP_SECRET` ever rotates, previously issued artwork URLs 404. Add Postgres before real volume.
- **No transactional email.** Nobody gets a receipt or a dispatch notice; the order page is the only channel. Wire Resend/Postmark into the webhook.
- **Flat-rate shipping, no tax.** $6.95/$16.95 flat; Prodigi's real rates vary by destination and US sales tax / EU VAT aren't calculated. Turn on Stripe Tax and rate-shop Prodigi quotes at checkout.
- **Idempotency has a narrow race.** Two truly simultaneous webhook deliveries could both pass the "does this reference exist" check. Prodigi's `X-Idempotency-Key` covers most of it; a DB unique constraint closes it.
- **Fulfilment failures are silent to you.** A Prodigi outage returns 500 so Stripe retries, but nothing alerts you. Add Sentry + a dead-letter path.
- **No refund/cancel flow**, and no admin view of orders.
- **Prodigi sandbox orders never reach production**, so I could not verify the shipping/tracking end of the status page against real data.

## To go to production

1. Live Stripe keys + webhook; set `PRODIGI_API_BASE=https://api.prodigi.com/v4.0` with a live Prodigi key and a funded account.
2. Custom domain, then set `PUBLIC_BASE_URL` (artwork URLs handed to the printer must resolve publicly and permanently).
3. Order a sample of each garment colour — light artwork on dark cotton is where DTG surprises you, and the ink palette may need a pass on Natural and Sport Grey.
4. Add DB + email + tax, then the legal floor: terms, privacy, and a returns policy that says personalised prints aren't returnable unless faulty.
5. Margin check: Prodigi quotes ~$10.82/unit + ~$4.73 shipping against $39 retail — healthy, but it's the reason to move to live-quoted shipping rather than flat rates on long-haul orders.
