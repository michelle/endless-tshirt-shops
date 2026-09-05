I have a background waiter armed on the Stripe retry log, so I'll pause here and resume automatically when the sandbox is provisioned.

Status so far:

- **Built and deployed**: https://benchmark-20260904-harness7-high-cl.vercel.app (Next.js 16, Stripe Elements checkout, Prodigi fulfilment, on-demand 300 dpi artwork, admin page, health endpoint).
- **Prodigi verified**: a sandbox order built by the real fulfilment code was accepted, the idempotency key returned the same order on retry, and Prodigi downloaded the print file from the deployed artwork route.
- **Blocked on Stripe**: `stripe sandbox create` has returned 429 for about 20 minutes. A retry loop runs every four minutes. Once a key exists I'll register the webhook, set the Vercel env vars, redeploy, and run the browser end-to-end purchase with the 4242 test card.
