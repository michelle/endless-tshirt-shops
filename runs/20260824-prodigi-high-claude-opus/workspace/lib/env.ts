/** Server-side configuration, read lazily so builds never fail on a missing key. */

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function required(name: string): string {
  const value = optional(name);
  if (!value) {
    throw new ConfigError(`Missing required environment variable: ${name}`);
  }
  return value;
}

export class ConfigError extends Error {}

export const env = {
  get stripeSecretKey() {
    return required('STRIPE_SECRET_KEY');
  },
  get stripeWebhookSecret() {
    return optional('STRIPE_WEBHOOK_SECRET');
  },
  get prodigiApiKey() {
    return required('PRODIGI_API_KEY');
  },
  /** `sandbox` (default) or `live`. */
  get prodigiEnvironment(): 'sandbox' | 'live' {
    return optional('PRODIGI_ENVIRONMENT') === 'live' ? 'live' : 'sandbox';
  },
  /**
   * When true, Prodigi orders are validated (via the quote endpoint) but never
   * actually submitted. Useful for load tests and for staging environments that
   * point at the live Prodigi API.
   */
  get prodigiDryRun() {
    return optional('PRODIGI_DRY_RUN') === 'true';
  },
};

/**
 * Absolute, publicly reachable origin for this deployment. Prodigi fetches the
 * print asset from here, so it must be reachable from outside Vercel.
 */
export function baseUrl(): string {
  const explicit = optional('PUBLIC_BASE_URL');
  if (explicit) return explicit.replace(/\/$/, '');

  const production = optional('VERCEL_PROJECT_PRODUCTION_URL');
  if (production) return `https://${production}`;

  const deployment = optional('VERCEL_URL');
  if (deployment) return `https://${deployment}`;

  return `http://localhost:${optional('PORT') ?? 3000}`;
}

/** Non-secret snapshot of configuration, for /api/health. */
export function configStatus() {
  const key = optional('STRIPE_SECRET_KEY');
  return {
    baseUrl: baseUrl(),
    stripe: {
      configured: Boolean(key),
      mode: key ? (key.includes('_live_') ? 'live' : 'test') : null,
      publishableKeyConfigured: Boolean(optional('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')),
      webhookSecretConfigured: Boolean(optional('STRIPE_WEBHOOK_SECRET')),
    },
    prodigi: {
      configured: Boolean(optional('PRODIGI_API_KEY')),
      environment: env.prodigiEnvironment,
      dryRun: env.prodigiDryRun,
    },
  };
}
