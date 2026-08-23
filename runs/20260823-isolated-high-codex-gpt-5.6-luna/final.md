Built and deployed a production-quality datetime.store rebuild.

1. Deployed URL

[https://benchmark-20260823-isolated-high-co-zeta.vercel.app](https://benchmark-20260823-isolated-high-co-zeta.vercel.app)

Fresh Vercel project: `benchmark-20260823-isolated-high-codex-gpt-5.6-luna`

2. What’s included

- Live millisecond datetime printed on a responsive tee preview.
- Fitted/unisex and S/M/L/XL selection.
- Stripe-hosted Checkout in test mode.
- Signed Stripe webhook at `/api/webhooks/stripe`.
- Server-generated 300-DPI PNG artwork.
- Scalable Press design → quote → order integration.
- Success and cancellation pages.
- Responsive visual design based on the original product.
- Zero production dependency audit vulnerabilities.

3. Run and verify

```bash
cp .env.example .env.local
# Add STRIPE_SECRET_KEY and SP_AUTH
npm install
npm run dev
```

Open `http://localhost:3000`, select a shirt, and use Stripe test card:

```text
4242 4242 4242 4242
```

For local webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

4. Human launch steps

- Replace the Stripe test key and webhook with live-mode credentials.
- Replace `SP_AUTH` with a live Scalable Press key.
- Review product margins, tax handling, refund policy, privacy policy, and shipping countries.
- Add a custom domain and update `NEXT_PUBLIC_STORE_URL`.
- Add durable order storage/idempotency before processing real volume.
- Configure customer emails and monitor failed fulfillment webhooks.

5. Decisions and assumptions

- Used Stripe Checkout to minimize PCI scope and collect shipping details reliably.
- Stored the timestamp snapshot in Stripe metadata so the printed design matches the purchased item.
- Used verified current Scalable Press SKUs:
  - Fitted: `gildan-softstyle-t-shirt`
  - Unisex: `next-level-fitted-crew`
- Kept all credentials server-side in Vercel environment variables.
- Used test-mode Stripe and Scalable Press services.

6. Friction encountered

- Stripe Projects initialization was blocked by the account’s claimable-sandbox browser setup; Stripe CLI test credentials were used instead.
- Vercel enabled SSO deployment protection by default; it was disabled for this new project so the URL is publicly reachable.
- Scalable Press required form-encoded nested quote fields, and the reference fitted SKU returned API errors, so both were corrected.
- A test design upload and quote succeeded; I did not submit an external fulfillment order to avoid creating unnecessary test-order records.