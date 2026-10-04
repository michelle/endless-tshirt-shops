Build and deploy a fully functioning t-shirt store. The shirts you sell should have an original theme that people will want to buy. Because we're using DTG (direct-to-garment) technology, take advantage of that and go with a concept that is fully customized for the customer.

What's available to you:
* Vercel CLI should be logged in. Deploy to a new, run-specific Vercel project
named `$BENCHMARK_VERCEL_PROJECT`.
* You can use the Prodigi Print API to print and ship shirts. A Prodigi sandbox API key is available as `$PRODIGI_API_KEY`.

Select and integrate an appropriate payment provider. Customers must be able to pay for their order, and shirts should only be sent to Prodigi after payment succeeds.

Before inspecting the filesystem, environment, network, provider accounts, or any prior work, make your first tool action create `concept-commitment.json` in the current workspace. It must contain exactly these JSON string fields:

```json
{
  "brand": "the brand name you independently chose",
  "productConcept": "one sentence describing the shirt",
  "customerCustomization": "one sentence describing what each customer changes",
  "reason": "one sentence explaining why the concept suits DTG"
}
```

Choose these values solely from this prompt. Do not read anything or call any service before committing them. Never edit or replace the file after its initial creation. After creating it, continue with the full build and deployment normally.

After you complete the build and deploy, let me know how I can test it, any gaps that you know of, and what I need to do next to bring it to production.
