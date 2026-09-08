#!/usr/bin/env bash
# One-shot Stripe setup for a Bloomprint deployment.
#
#   ./scripts/configure-stripe.sh https://your-deployment.vercel.app sk_test_...
#
# 1. Creates a Stripe webhook endpoint for /api/stripe/webhook
# 2. Stores STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET as Vercel production env vars
# 3. Redeploys so the new env vars take effect
#
# Requires: curl, jq (or python3), vercel CLI linked to this project.
set -euo pipefail

SITE_URL="${1:-}"
STRIPE_KEY="${2:-${STRIPE_SECRET_KEY:-}}"
if [[ -z "$SITE_URL" || -z "$STRIPE_KEY" ]]; then
  echo "usage: $0 <site-url> <stripe-secret-key>" >&2
  exit 1
fi
SITE_URL="${SITE_URL%/}"

echo "Creating webhook endpoint for $SITE_URL/api/stripe/webhook ..."
RESP=$(curl -sS https://api.stripe.com/v1/webhook_endpoints \
  -u "$STRIPE_KEY:" \
  -d "url=$SITE_URL/api/stripe/webhook" \
  -d "enabled_events[]=checkout.session.completed" \
  -d "enabled_events[]=checkout.session.async_payment_succeeded" \
  -d "description=Bloomprint fulfillment")

if command -v jq >/dev/null; then
  WHSEC=$(echo "$RESP" | jq -r '.secret // empty')
  ERR=$(echo "$RESP" | jq -r '.error.message // empty')
else
  WHSEC=$(echo "$RESP" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("secret",""))')
  ERR=$(echo "$RESP" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("error",{}).get("message",""))')
fi
if [[ -n "$ERR" || -z "$WHSEC" ]]; then
  echo "Stripe error: ${ERR:-no secret returned}" >&2
  echo "$RESP" >&2
  exit 1
fi
echo "Webhook created."

echo "Storing env vars on Vercel (production) ..."
vercel env rm STRIPE_SECRET_KEY production --yes >/dev/null 2>&1 || true
vercel env rm STRIPE_WEBHOOK_SECRET production --yes >/dev/null 2>&1 || true
printf '%s' "$STRIPE_KEY" | vercel env add STRIPE_SECRET_KEY production
printf '%s' "$WHSEC" | vercel env add STRIPE_WEBHOOK_SECRET production

echo "Redeploying ..."
vercel deploy --prod --yes
echo
echo "Done. Test with card 4242 4242 4242 4242 at $SITE_URL/design"
