#!/usr/bin/env bash
# One-time Stripe wiring for a deployment.
#   scripts/setup-stripe.sh https://your-domain.example
# Requires: stripe CLI authenticated (test or live), vercel CLI linked to the project.
set -euo pipefail
SITE_URL="${1:?usage: setup-stripe.sh <site-url>}"
SITE_URL="${SITE_URL%/}"

echo "→ Reading API keys from the Stripe CLI profile"
SECRET_KEY="$(stripe config --list | awk -F"'" '/test_mode_api_key|live_mode_api_key/ {print $2; exit}')"
PUB_KEY="$(stripe config --list | awk -F"'" '/test_mode_pub_key|live_mode_pub_key/ {print $2; exit}')"
[[ -n "$SECRET_KEY" && -n "$PUB_KEY" ]] || { echo "Could not read keys from stripe config"; exit 1; }

echo "→ Registering webhook endpoint ${SITE_URL}/api/webhooks/stripe"
WEBHOOK_JSON="$(stripe webhook_endpoints create \
  --url "${SITE_URL}/api/webhooks/stripe" \
  -d "enabled_events[]=payment_intent.succeeded" \
  -d "description=datetime.store fulfilment" \
  --api-key "$SECRET_KEY")"
WEBHOOK_SECRET="$(printf '%s' "$WEBHOOK_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["secret"])')"

echo "→ Writing Vercel environment variables"
for env in production preview development; do
  printf '%s' "$SECRET_KEY"     | vercel env add STRIPE_SECRET_KEY "$env" --force >/dev/null
  printf '%s' "$PUB_KEY"        | vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY "$env" --force >/dev/null
  printf '%s' "$WEBHOOK_SECRET" | vercel env add STRIPE_WEBHOOK_SECRET "$env" --force >/dev/null
done
echo "✓ Done. Redeploy with: vercel --prod"
