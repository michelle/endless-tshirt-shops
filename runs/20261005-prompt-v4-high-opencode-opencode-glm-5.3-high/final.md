The store is built, deployed, and verified end-to-end. My processes are running and the public URL is live.

---

## ✦ Starloom — the night sky above your moment, on a tee

**Deployed at:** `https://ohio-hostel-rrp-blast.trycloudflare.com`

**The concept (built for DTG):** every shirt is *computed for one customer*. You pick a **date, a time, and a place** — the store computes the exact sky that hung above those coordinates at that minute (3,596 real catalogue stars in their true positions, all 88 constellation lines, zenith-centered stereographic chart), and prints it direct-to-garment at 300 dpi. One night, one shirt — no two orders are ever the same.

## How to test it

1. Open **https://ohio-hostel-rrp-blast.trycloudflare.com**
2. Pick a moment (or press **now**), search a city (Kyoto, Lisbon, Buenos Aires…), type a title/message, pick color + size — the preview updates live. **The preview and the print file are drawn by the same code**, so it's true WYSIWYG.
3. **Continue to checkout** → fill the shipping form → you land on the payment page.
4. Pay with the sandbox test gateway:
   - `4242 4242 4242 4242` → approved, order proceeds to fulfilment
   - `4000 0000 0000 0002` → declined (order stays unpaid, nothing printed)
   - `4000 0000 0000 9995` → insufficient funds
5. You land on the **order page** — a live timeline (payment ✓ → print file rendered → sent to print network → assets downloaded → prepared → lab allocated → in production → shipping). It polls Prodigi status every ~9s.

Already-placed demo orders you can look at: `/order/sl_1bc24e617725` (Reykjavík, navy XL) and `/order/sl_e17386a7cbdb` (Cape Town, white S).

## What I verified (not just built)

- **Astronomy**: unit-tested — GMST against the J2000.0 known value, Polaris altitude ≈ observer latitude at 3 latitudes, Orion/Vega in their correct quadrants, DST wall-time conversions. I caught and fixed a 180° azimuth bug this way, plus an ASCII-render check of the chart.
- **Print file quality**: 4677×5881 px RGBA PNG (Prodigi's exact front print area for the Gildan 64000), fully transparent background, audited pixel-by-pixel (ring, star field, typography bands, cardinals, no stray ink).
- **Prodigi integration**: real sandbox orders `ord_1177939/40/41` created; Prodigi **successfully downloaded the print files from the public URL** (`downloadAssets: Complete`, item `Ok`) and the store reflects live Prodigi stage details.
- **Payment gating**: fulfillment (render → host → submit to Prodigi) runs **only** after a successful charge; declined/invalid cards leave the order unpaid and nothing is sent.
- Merchant economics: wholesale is quoted per destination (US: $11.90 + $4.63 shipping vs. $49 retail) and recorded on each order — never exposed to the browser.

## Known gaps

1. **Payments are simulated.** No payment-provider credentials existed in this environment, so the default driver is a clearly-badged sandbox test gateway (Luhn checks, realistic test-card outcomes). A complete, real **Stripe Checkout** driver is already coded and activates automatically when `STRIPE_SECRET_KEY` is set (redirect flow, session verification on return, signature-checked webhook).
2. **Deployment is ephemeral.** It's a Cloudflare quick tunnel to this machine — the URL dies if the process stops, and quick-tunnel URLs are rate-limited/unbranded. It demonstrates the full public flow but isn't a permanent host.
3. **Order storage is a JSON file** and print files are local disk — fine for a demo, needs a database/object storage at volume.
4. **No email confirmations** to customers, and Prodigi callbacks (`PRODIGI_CALLBACK_URL`) aren't wired — status is pulled on-demand instead.
5. Fixed pricing ($42 + $7) for all destinations; a production store should vary shipping by country (the wholesale quote per destination is already fetched and stored to support this).
6. Small product line by design: one shirt (Gildan Softstyle 64000), 3 colors, s–3xl. Minor: ambiguous DST wall-times (a 1:30 AM on fall-back night) resolve to the first occurrence; star positions use the catalogue epoch without precession (accurate to ~½° for ±60 years — fine for a gift, noted in code).

## To take it to production

1. **Payments**: create a Stripe account, set `STRIPE_SECRET_KEY` (+ `STRIPE_WEBHOOK_SECRET`, point the webhook at `/webhooks/stripe`). No code changes needed.
2. **Prodigi**: get a **live** API key (free account) and set `PRODIGI_API_BASE=https://api.prodigi.com/v4.0` + `PRODIGI_API_KEY=<live>`; set `PRODIGI_CALLBACK_URL` and add callback handling for shipment/tracking updates.
3. **Hosting**: deploy anywhere Node runs (Render/Fly/Railway/a VPS) with `npm install && npm start`; set `BASE_URL` to the public origin (print files must be publicly fetchable — or push them to S3 and pass those URLs). Add a real DB for orders and a process manager (the tunnel + `nohup node server.js` here is demo-only).
4. **Before launch**: order a **physical sample** of your own design to QA the DTG output (white ink on black, dot sizes) — sandbox doesn't prove print quality; add tax handling (Prodigi quotes flag US sales tax); wire transactional emails; consider a mockup-photo gallery using Prodigi's product shots.

The repo (committed, 29 files) is in the workspace — `README.md` documents architecture, env vars, and the test suite (`npm test`).
