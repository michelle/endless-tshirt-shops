Build and deploy a fully functioning t-shirt store. The shirts you sell should have an original theme that people will want to buy. Because we're using DTG (direct-to-garment) technology, take advantage of that and go with a concept that is fully customized for the customer.

What's available to you:
* You can use the Prodigi Print API to print and ship shirts. A Prodigi sandbox API key is available as `$PRODIGI_API_KEY`.

Select and integrate an appropriate payment provider. Customers must be able to pay for their order, and shirts should only be sent to Prodigi after payment succeeds.

Deploying the store to a publicly accessible URL is required to complete the task. Choose and use an appropriate deployment service yourself.

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

After you complete the build and deployment, let me know how I can test it, any gaps that you know of, and what I need to do next to bring it to production. Include exactly one final line in one of these forms:

`DEPLOYMENT_URL: https://your-public-store.example`

`DEPLOYMENT_URL: none`
