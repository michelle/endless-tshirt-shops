/**
 * Server-side configuration. Read lazily so that a missing variable surfaces as
 * a clean API error instead of crashing the whole serverless function on import.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new ConfigError(`${name} is not configured on the server.`);
  }
  return value;
}

export class ConfigError extends Error {
  readonly code = 'configuration_error';
}

export const env = {
  get stripeSecretKey() {
    return required('STRIPE_SECRET_KEY');
  },
  get stripeWebhookSecret() {
    return process.env.STRIPE_WEBHOOK_SECRET ?? '';
  },
  get scalablePressAuth() {
    return required('SP_AUTH');
  },
  /**
   * When true, the Scalable Press order is *not* submitted for real; the quote
   * and design calls still run so the integration is exercised end to end.
   */
  get dryRunFulfillment() {
    return process.env.SP_DRY_RUN === 'true';
  },
};
