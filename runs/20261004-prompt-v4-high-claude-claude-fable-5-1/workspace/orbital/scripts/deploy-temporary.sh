#!/usr/bin/env bash
# Builds locally and (re)deploys to Vercel as a claimable "temporary" deployment,
# then points the Stripe webhook endpoint at the deployed URL.
# Requires: .env.local filled in (see .env.example), vercel CLI, curl, python3.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env.local; set +a

# A temporary deployment expires 60 min after creation unless claimed. Pass --fresh
# to start a brand-new one (new URL, new 60-minute window, new claim link).
if [[ "${1:-}" == "--fresh" ]]; then rm -rf .vercel; fi

# `vercel deploy --temporary` builds locally (so the Linux resvg binaries in optionalDependencies
# must be installed: see README) and uploads the output. Clear stale build output first.
rm -rf .vercel/output .next
OUT=$(vercel deploy --prod --temporary --yes \
  -e STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" -e STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-}" \
  -e PRODIGI_API_KEY="$PRODIGI_API_KEY" -e PRODIGI_API_BASE="$PRODIGI_API_BASE" \
  -e ART_SIGNING_SECRET="$ART_SIGNING_SECRET" -e ADMIN_KEY="$ADMIN_KEY" -e SITE_URL="${SITE_URL:-}")
echo "$OUT" | grep -E '"url"|claimUrl|message' || true
URL=$(echo "$OUT" | grep -o 'https://temporary-[a-z0-9-]*\.vercel\.app' | head -1)
[[ -n "$URL" ]] || { echo "deploy failed"; echo "$OUT"; exit 1; }

if [[ "${SITE_URL:-}" != "$URL" ]]; then
  echo "New URL $URL — updating SITE_URL and Stripe webhook, then redeploying once more."
  WH_JSON=$(curl -s https://api.stripe.com/v1/webhook_endpoints -u "$STRIPE_SECRET_KEY:" \
    -d "url=$URL/api/webhooks/stripe" -d "enabled_events[]=checkout.session.completed" \
    -d "enabled_events[]=checkout.session.async_payment_succeeded" -d "description=Orbital store ($URL)")
  WH=$(echo "$WH_JSON" | python3 -c 'import json,sys;print(json.load(sys.stdin)["secret"])')
  sed -i.bak "s#^STRIPE_WEBHOOK_SECRET=.*#STRIPE_WEBHOOK_SECRET=$WH#; s#^SITE_URL=.*#SITE_URL=$URL#" .env.local && rm -f .env.local.bak
  exec "$0"
fi
echo "Deployed: $URL"
