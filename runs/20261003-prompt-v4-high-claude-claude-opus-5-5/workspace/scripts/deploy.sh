#!/usr/bin/env bash
# Builds locally on Node 24 and deploys to Vercel with secrets from .env.local.
#   scripts/deploy.sh            -> anonymous, claimable temporary deployment
#   scripts/deploy.sh --linked   -> your own Vercel project (after `vercel login` / `vercel link`)
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env.local; set +a
ENV_FLAGS=()
for k in STRIPE_SECRET_KEY PRODIGI_API_KEY PRINT_SIGNING_SECRET CRON_SECRET STRIPE_WEBHOOK_SECRET PRODIGI_API_BASE PUBLIC_BASE_URL; do
  [ -n "${!k:-}" ] && ENV_FLAGS+=(-e "$k=${!k}")
done
vercel build --prod
if [ "${1:-}" = "--linked" ]; then
  vercel deploy --prebuilt --prod "${ENV_FLAGS[@]}"
else
  vercel deploy --prebuilt --prod --temporary --yes --non-interactive "${ENV_FLAGS[@]}"
fi
