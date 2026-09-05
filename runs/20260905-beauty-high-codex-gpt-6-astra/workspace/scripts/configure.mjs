import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import Stripe from "stripe";
import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
loadEnvConfig(process.cwd());
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const url = process.env.SITE_URL + "/api/webhooks/stripe";
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
let endpoint = endpoints.data.find((e) => e.url === url);
let secret = process.env.STRIPE_WEBHOOK_SECRET;
if (!endpoint) {
  endpoint = await stripe.webhookEndpoints.create({
    url,
    enabled_events: [
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
    ],
    description: "datetime.store sandbox fulfillment",
  });
  secret = endpoint.secret;
  await fs.appendFile(".env.local", "\nSTRIPE_WEBHOOK_SECRET=" + secret + "\n");
}
if (!secret) throw new Error("Existing webhook needs its signing secret.");
for (const [name, value] of Object.entries({
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: secret,
  PRODIGI_API_KEY: process.env.PRODIGI_API_KEY,
  PRODIGI_ENV: "sandbox",
  NEXT_PUBLIC_STORE_MODE: "test",
  ARTWORK_SIGNING_SECRET: process.env.ARTWORK_SIGNING_SECRET,
  SITE_URL: process.env.SITE_URL,
})) {
  const result = spawnSync(
    "vercel",
    ["env", "add", name, "production", "--force"],
    { input: value, encoding: "utf8" },
  );
  if (result.status) throw new Error(name + ": " + result.stderr);
  console.log("Configured " + name);
}
const project = JSON.parse(await fs.readFile(".vercel/project.json", "utf8"));
// This user-authorized public storefront must accept Stripe webhooks and Prodigi downloads.
const privacy = spawnSync(
  "vercel",
  ["api", `/v9/projects/${project.projectId}`, "-X", "PATCH", "--input", "-"],
  {
    input: JSON.stringify({ ssoProtection: null, framework: "nextjs" }),
    encoding: "utf8",
  },
);
if (privacy.status)
  throw new Error("Could not configure public storefront: " + privacy.stderr);
console.log("Public storefront configured. Webhook: " + endpoint.id);
await fs.mkdir("artifacts", { recursive: true });
await fs.writeFile(
  "artifacts/deployment-config.json",
  JSON.stringify(
    { webhookId: endpoint.id, url, projectId: project.projectId },
    null,
    2,
  ),
);
