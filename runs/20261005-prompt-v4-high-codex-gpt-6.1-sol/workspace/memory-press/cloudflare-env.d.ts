declare namespace Cloudflare {
 interface Env {
  DB: D1Database; BUCKET: R2Bucket;
  PRODIGI_API_KEY: string; PRODIGI_ENV: string; SITE_URL: string;
  OWNER_EMAIL?: string; STRIPE_SECRET_KEY?: string; STRIPE_WEBHOOK_SECRET?: string; DEMO_MODE?: string;
 }
}
