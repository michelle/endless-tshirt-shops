import { env } from "cloudflare:workers";
export const SITE_URL = "https://elsewhere-always.hazelcough.chatgpt.site";
export const PRICE_CENTS = 4200;
type StoreEnv = { DB: D1Database; BUCKET: R2Bucket; STRIPE_SECRET_KEY?: string; STRIPE_WEBHOOK_SECRET?: string; PRODIGI_API_KEY?: string; PRODIGI_API_BASE?: string };
export const bindings = () => env as unknown as StoreEnv;
export const reply = (data: unknown, status = 200) => Response.json(data, { status });
