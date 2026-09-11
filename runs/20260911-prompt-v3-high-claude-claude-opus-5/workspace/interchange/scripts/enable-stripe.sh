#!/usr/bin/env bash
# Switch the deployment from the built-in sandbox checkout to real Stripe Checkout.
#
#   ./scripts/enable-stripe.sh sk_test_... whsec_...
#
# Create the webhook first (Stripe Dashboard > Developers > Webhooks):
#   endpoint:  https://<your-domain>/api/stripe/webhook
#   events:    checkout.session.completed
#              checkout.session.async_payment_succeeded
set -euo pipefail

SECRET_KEY="${1:?usage: enable-stripe.sh <STRIPE_SECRET_KEY> <STRIPE_WEBHOOK_SECRET>}"
WEBHOOK_SECRET="${2:?usage: enable-stripe.sh <STRIPE_SECRET_KEY> <STRIPE_WEBHOOK_SECRET>}"

printf '%s' "$SECRET_KEY"     | vercel env add STRIPE_SECRET_KEY production --force
printf '%s' "$WEBHOOK_SECRET" | vercel env add STRIPE_WEBHOOK_SECRET production --force

vercel deploy --prod --yes

echo
echo "Done. Check /api/health - paymentProvider should now read \"stripe\"."
