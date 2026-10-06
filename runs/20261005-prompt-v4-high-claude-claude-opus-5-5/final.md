The Lifeline Transit Co. store is live at **https://median-glass-artificial-cooperative.trycloudflare.com**. That URL is served from your Mac through a tunnel, not from a hosting service, so it only works while your Mac stays awake. I tested a full purchase end to end: designing a shirt, paying with the Stripe test card, and the order reaching Prodigi.

**The concept: "your life, as a subway line."** The customer designs a transit-map tee of their own life. They pick a route bullet (a letter), a line color, a line name ("The Jamie Line"), and up to 8 stops ("Toledo General · Born 1991"). Transfer bullets mark the people who joined their route, and an optional dashed "Next stop" ends the line. Every shirt is one of a kind, which is what DTG printing allows, and it works well as a gift for birthdays, weddings, retirements and graduations.

## How to test it
1. Open the URL, pick a template or "Start blank", and edit. The preview is the exact file that gets printed; switch to "Print file" to see it at full size.
2. Choose shirt color, sizes and country. Shipping is quoted live from Prodigi.
3. At Stripe Checkout, pay with card `4242 4242 4242 4242`, any future date, any CVC.
4. You land on an order page that shows payment received, then a Prodigi order ID.

**What I checked:**
- **Order and print file:** my test order `ord_1177888` reached Prodigi with the right address, sizes (L and 2XL), color and shipping method. Prodigi downloaded and accepted the 4680×5790 transparent PNG print file, and the order is now in production in the sandbox.
- **Paid-only, no duplicates:** unpaid checkout sessions never create a Prodigi order. The webhook and the success page both trigger fulfilment, and only one order gets created.
- **Security:** fake webhooks and tampered print-file URLs are rejected, and the server-side key file isn't reachable from the web.
- **Layout:** no console errors, and desktop and mobile both display correctly.

One earlier test order, `ord_1177873`, also exists in the Prodigi sandbox. It couldn't be cancelled; it's sandbox-only.

## Decisions you should know about
- **No hosting service was available.** None of the deploy tools on this machine are logged in. Vercel retired its no-login deploy endpoint. Netlify's anonymous mode won't deploy server functions, and Cloudflare's temporary accounts expire after 60 minutes and can't render the print files. So I'm serving the store from `~/lifeline-transit` on your Mac through a free Cloudflare tunnel. It goes down if the Mac sleeps or the process stops, and the URL changes on restart. To keep it up I'm running `caffeinate -i` (prevents idle sleep only). To stop everything: `pkill -f scripts/host.sh; pkill -f localhost:3456; pkill -f scripts/server.mjs`
- **Stripe:** I created an anonymous Stripe sandbox registered to your email. It **expires Oct 13** unless you claim it at https://dashboard.stripe.com/onboard_sandbox/YWNjdF8xVU5LZTFHd2kwVmhOR0dtLDE3OTE4NTI1MDQv100VQRqWV4Z
- **Credentials I didn't use:** I found credential folders in your home directory (`~/.bench-secrets`, `~/.tshirt-secrets`, etc.). You didn't give them to me for this task, so I didn't touch them.

## Known gaps
- **Not deployed to a hosting service.** The Netlify and Vercel configs are included. The Netlify adapter works locally, but I couldn't test either on the real platform.
- **No sales tax or VAT is collected.** Prodigi's quotes warn that US sales tax may apply.
- **Failed print submissions:** if Prodigi rejects an order, Stripe keeps retrying the webhook for up to 3 days. There's no alert or automatic refund.
- **Webhook checking:** the webhook verifies events by fetching them back from Stripe. It doesn't check Stripe's signature yet.
- **Store basics are missing:** no admin view, no custom order emails, no terms or privacy pages, and nothing filters offensive text.
- **Sandbox prices:** shipping is charged at Prodigi's cost rounded up, and sandbox orders ship from UK labs, so live prices will differ.
- **No physical proof yet,** and every size from XS to 4XL gets the same print size.

## Getting to production
1. Claim the Stripe sandbox (or use your own account), activate live mode, and turn on Stripe Tax.
2. Get a live Prodigi API key and set up billing there.
3. Deploy to Netlify following the steps in the README, setting the environment variables there. Point a custom domain at it and register the Stripe webhook for that domain.
4. Order physical samples on a light and a dark shirt to check how the print comes out.
5. Add terms, privacy and returns pages, a support email, and text moderation.

The code is in the workspace folder `lifeline/` and in `~/lifeline-transit` (the copy that's running); the README covers how it fits together.

Sources: [Stripe CLI sandbox](https://docs.stripe.com/cli/sandbox), [Netlify anonymous deploys](https://www.netlify.com/changelog/2026-03-27-create-and-deploy-anything-netlify-clis-improved-ax/), [Cloudflare temporary accounts](https://developers.cloudflare.com/workers/platform/claim-deployments/), [vercel-labs agent-skills](https://github.com/vercel-labs/agent-skills)
