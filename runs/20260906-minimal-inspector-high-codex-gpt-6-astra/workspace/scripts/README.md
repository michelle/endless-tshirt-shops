Operational setup scripts require local `.env.local` (ignored by Git).

- `setup-webhook.mjs`: creates a NEW Stripe webhook endpoint and appends its signing secret locally. Run only for a new Stripe account/environment. The deployed sandbox endpoint is already configured.
- `push-env.mjs`: writes the configured server secrets to the linked Vercel project's production environment. Redeploy afterwards. Never expose these values in client variables.
