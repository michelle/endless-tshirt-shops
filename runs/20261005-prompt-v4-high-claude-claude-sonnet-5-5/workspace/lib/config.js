// Central configuration. Secrets come from environment variables; `secrets.generated.js`
// (written by scripts/deploy.sh, git-ignored) is a fallback for hosts that cannot set env vars.
import generated from './secrets.generated.js';

const env = (name) => process.env[name] || generated[name] || '';

export const config = {
  get prodigiKey() { return env('PRODIGI_API_KEY'); },
  get stripeSecretKey() { return env('STRIPE_SECRET_KEY'); },
  get stripeWebhookSecret() { return env('STRIPE_WEBHOOK_SECRET'); },
  get signingSecret() { return env('SIGNING_SECRET') || this.stripeSecretKey || this.prodigiKey; },
  get siteUrl() { return env('SITE_URL').replace(/\/$/, ''); },
  get prodigiBase() {
    const explicit = env('PRODIGI_API_URL');
    if (explicit) return explicit.replace(/\/$/, '');
    return this.prodigiSandbox ? 'https://api.sandbox.prodigi.com/v4.0' : 'https://api.prodigi.com/v4.0';
  },
  // Sandbox keys are prefixed `test_`; live keys are not.
  get prodigiSandbox() { return this.prodigiKey.startsWith('test_'); },
  get stripeEnabled() { return !!this.stripeSecretKey; },
  // The demo checkout never charges anyone, so it only exists while Prodigi is in sandbox mode
  // (nothing is physically printed) and no real payment provider is configured.
  get demoPayments() { return !this.stripeEnabled && this.prodigiSandbox; },
  get paymentsReady() { return this.stripeEnabled || this.demoPayments; },
};

export function originFromHeaders(headers) {
  if (config.siteUrl) return config.siteUrl;
  const host = headers.get('x-forwarded-host') || headers.get('host');
  const proto = headers.get('x-forwarded-proto') || (host && host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
