/** Server-side environment access, with loud failures instead of silent ones. */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. See README.md for setup.`,
    );
  }
  return value;
}

export const serverEnv = {
  stripeSecretKey: () => required('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: () => required('STRIPE_WEBHOOK_SECRET'),
  prodigiApiKey: () => required('PRODIGI_API_KEY'),
  /**
   * Prodigi has to be able to fetch the artwork, so we need our own absolute
   * origin. Vercel exposes the deployment host; a canonical origin can override
   * it so production orders always reference the stable domain.
   */
  publicOrigin: (): string => {
    const explicit = process.env.PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_ORIGIN;
    if (explicit) return explicit.replace(/\/$/, '');
    const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
    if (vercel) return `https://${vercel}`;
    return 'http://localhost:3000';
  },
  /** Sandbox unless explicitly told otherwise. Fulfilment is hard to undo. */
  prodigiBaseUrl: (): string =>
    process.env.PRODIGI_ENV === 'live'
      ? 'https://api.prodigi.com/v4.0'
      : 'https://api.sandbox.prodigi.com/v4.0',
  isProdigiLive: (): boolean => process.env.PRODIGI_ENV === 'live',
};
