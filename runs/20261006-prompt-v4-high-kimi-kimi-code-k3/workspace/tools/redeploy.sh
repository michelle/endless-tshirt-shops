#!/bin/bash
# Redeploys the store to the same anonymous Vercel deployment, refreshing its
# 60-minute expiry. Env vars must be passed on every deploy — anonymous
# redeploys drop them otherwise.
set -e
cd "$(dirname "$0")/.."
export PATH="/var/folders/mq/v8s9bp2x5gg6gvywwjfszb8r0000gn/T/benchmark-tools.AQ3onh/path/1:$PATH"
BASE="https://temporary-brisk-poplar-jvz563n.vercel.app"
mv secrets.local.env /tmp/wits-secrets.keep
trap 'mv /tmp/wits-secrets.keep secrets.local.env 2>/dev/null || true' EXIT
set -a; source /tmp/wits-secrets.keep; set +a
node tools/bundle.js
vc deploy --temporary --yes \
  -e STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
  -e STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" \
  -e ART_SIGNING_SECRET="$ART_SIGNING_SECRET" \
  -e PRODIGI_API_KEY="$PRODIGI_API_KEY" \
  -e PUBLIC_URL="$BASE"
