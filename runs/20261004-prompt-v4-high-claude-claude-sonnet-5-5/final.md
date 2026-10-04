The Orrery store is built and live. Checkout runs on a sandbox-only demo payment, not real payments. I tested it end to end, including a browser run through the public URL with demo payment and the Prodigi sandbox.

**Live URL:** https://harry-print-dimension-desktop.trycloudflare.com

**What it sells.** Each Orrery tee prints the solar system as arranged on a date the customer picks (1800–2050), with the real moon phase, their name, a dedication line, and a star field unique to the order. Planet positions match JPL Horizons within 0.5°. Print files are 4665×5844 transparent PNGs at 300 dpi, with ink colors chosen for dark or light shirts. I checked the close-up on a black tee and it looks good.

**How to test**
1. Open the URL, set a date and name, and add the shirt to your cart.
2. Check out with any shipping address, then click "Pay with test card" on the demo payment page.
3. You land on the order tracking page. The order goes to Prodigi only after that payment step. My test order `ord_1177257` was accepted in the sandbox with the right SKU, size and recipient, and Prodigi downloaded the print file.
4. `/admin` uses Basic auth; the password is in `/tmp/orrery-admin-token`.
5. `npm test` runs 13 passing tests.

**Known gaps**
- **No real payments yet.** The Stripe integration is written, but I had no Stripe credentials, so I tested it only against a fake Stripe API and signed test webhooks. It has never run against real Stripe. I did not open the other credential files on this machine.
- **Temporary hosting.** A free Cloudflare quick tunnel serves the store from this machine. The URL changes whenever the tunnel or server restarts, and it's down if the machine sleeps.
- **Deploy configs are untested.** The `Dockerfile`, `render.yaml` and `fly.toml` are written but I couldn't run them (no Docker here).
- **Missing legal pages.** There are no Terms, Privacy or Returns pages.
- **Unchecked on fabric.** I haven't seen a physical print, only renders and the sandbox order. The sandbox prints nothing.
- **Pricing unchecked.** The $38 price and the flat shipping markup haven't been compared against Prodigi's production costs.
- **Orders can be lost.** Orders live in a local SQLite file, which is lost if the host has no persistent disk.

**To go to production**
1. Create a Stripe account and set `STRIPE_SECRET_KEY`. Add a webhook to `BASE_URL/api/stripe/webhook`, set its signing secret as `STRIPE_WEBHOOK_SECRET`, and remove `DEMO_PAYMENTS`.
2. Get a production Prodigi key with billing set up, and set `PRODIGI_BASE_URL=https://api.prodigi.com/v4.0`.
3. Deploy the `Dockerfile` (or `render.yaml` / `fly.toml`) on a host with a persistent disk and a stable domain. Set `BASE_URL`, a strong `ADMIN_TOKEN`, and `DATA_DIR` on the disk.
4. Order one real shirt to yourself and inspect it.
5. Add the legal pages and review pricing.

`README.md` and `.env.example` in the project folder cover the setup and settings in detail.
