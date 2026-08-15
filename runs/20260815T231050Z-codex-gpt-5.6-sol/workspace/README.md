# datetime.store

A production-minded rebuild of the original `dt-shirt`: choose a cut and size while a Unix timestamp updates live, then freeze that exact millisecond and buy the one-of-one shirt through Stripe Checkout.

## Run locally

Requires Node 20+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Use Stripe test keys and a Scalable Press test key. Keep `SP_SUBMIT_ORDERS=false` until the catalog, pricing, tax, support, and operational process have been approved. Stripe's standard test card is `4242 4242 4242 4242`, any future expiry, and any CVC/postal code.

## Verify

```bash
npm test
npm run build
curl http://localhost:3000/api/health
```

The checkout endpoint creates a hosted Stripe Checkout Session. After successful payment, `/success` verifies the session, renders the timestamp as a transparent print-resolution PNG, creates a Scalable Press DTG design, obtains an address-specific quote, and records the fulfillment identifiers on the Stripe PaymentIntent. With dry-run enabled it deliberately does not call the physical-order endpoint.

## Launch checklist

1. Replace the temporary Stripe sandbox credentials with durable test/live credentials and configure production business details, receipts, tax, and support contact.
2. Confirm current Scalable Press product/color/size availability and unit economics.
3. Add a durable order database and a signed Stripe `checkout.session.completed` webhook with retry/background processing. The success-page fulfillment trigger is suitable for this sandbox but not the only production trigger you should rely on.
4. Run a physical sample order, approve print positioning/quality, then set `SP_SUBMIT_ORDERS=true`.
5. Add legal pages, customer-service policy, analytics/consent choices, a custom domain, and transactional fulfillment emails.
