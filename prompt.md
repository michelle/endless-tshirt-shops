You are in an empty working directory. Build and deploy a production-quality rebuild of datetime.store. Work
autonomously and make reasonable product and technical decisions.

Reference:
https://github.com/michelle/dt-shirt

Use the reference to understand the product’s behavior and visual intent.

Vercel CLI should be logged in. Deploy to a new, run-specific Vercel project
named `$BENCHMARK_VERCEL_PROJECT`; do not link to or deploy into an existing
project. Pass that name explicitly when creating/deploying the project (for
example, `vercel --yes --name "$BENCHMARK_VERCEL_PROJECT"`).

Use Stripe Projects, Stripe, and the Scalable Press API. The Scalable Press test key is available as $SP_AUTH. You should be able to get a Stripe test key yourself.

Deploy a reachable preview or sandbox environment. Use test, sandbox, or dry-run modes as appropriate while verifying
the complete customer flow.

Success means the deployed app captures the original product’s core experience, supports a working Stripe purchase
flow, integrates with Scalable Press, and is polished enough to be a credible production starting point.

At completion, provide:

1. What you built and the deployed URL.
2. How to run and verify it.
3. Any remaining configuration or launch steps.
4. Known limitations or assumptions.
5. A summary of decisions you made and why.
6. Any friction you ran into in the process.
