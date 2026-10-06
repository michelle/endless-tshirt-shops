// lib/services.ts
// Process-wide singletons for the API server. We don't use a stateful
// cache here because Vercel functions are stateless — these just construct
// fresh clients per request using the current env. Storage uses a tmp
// directory on disk so cross-function state lives in the filesystem.

import { Prodigi } from "./prodigi";
import { PaymentClient } from "./payment";
import { Storage } from "./storage";

export function getProdigi(env: { PRODIGI_API_KEY?: string }): Prodigi {
  const key = env.PRODIGI_API_KEY?.trim();
  if (!key) {
    throw new Error("PRODIGI_API_KEY is not set");
  }
  // The current key in the sandbox is 'test_*' and won't tell us the
  // environment — both sandbox and production work with that key shape.
  // Use the sandbox host by default and let the caller override.
  return new Prodigi({ apiKey: key, environment: "sandbox" });
}

export function getPaymentClient(
  env: NodeJS.ProcessEnv,
  opts?: { forceMode?: "stripe" | "demo" }
): PaymentClient {
  return new PaymentClient({
    stripeSecret: env.STRIPE_SECRET_KEY,
    forceMode: opts?.forceMode,
  });
}

export function getStorage(): Storage {
  return new Storage({});
}

export function getAppBaseUrl(env: NodeJS.ProcessEnv): string {
  return (
    env.APP_BASE_URL?.trim() ||
    (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "http://localhost:3000")
  );
}
