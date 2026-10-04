import { env } from "cloudflare:workers";

type StoreRuntime = typeof env & {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  PRODIGI_API_KEY?: string;
};

export const runtimeEnv = env as StoreRuntime;
