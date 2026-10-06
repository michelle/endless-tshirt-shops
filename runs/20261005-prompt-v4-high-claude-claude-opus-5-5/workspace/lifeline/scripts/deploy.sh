#!/bin/bash
# Deploys to Netlify. Without a Netlify login it uses --allow-anonymous, which creates a
# claimable site (claim it within 60 minutes or Netlify deletes it).
#
# Secrets: anonymous deploys can't set environment variables, so server-only secrets are
# written into secrets.generated.js inside the function bundle (never in public/). After
# claiming, set STRIPE_SECRET_KEY / PRODIGI_API_KEY / PRINT_SIGNING_SECRET / PRODIGI_ENV as
# Netlify env vars and redeploy without them (env vars always take precedence anyway).
#
# Usage: STRIPE_SECRET_KEY=... PRODIGI_API_KEY=... PRINT_SIGNING_SECRET=... scripts/deploy.sh [netlify args]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NETLIFY="${NETLIFY_BIN:-npx -y netlify-cli@27}"
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

tar -C "$ROOT" --exclude=node_modules --exclude=.git --exclude=out --exclude='.env*' --exclude=.netlify -cf - . | tar -C "$STAGE" -xf -
if [ -n "${STRIPE_SECRET_KEY:-}" ]; then
  cat > "$STAGE/secrets.generated.js" <<JS
export default {
  STRIPE_SECRET_KEY: '${STRIPE_SECRET_KEY}',
  PRODIGI_API_KEY: '${PRODIGI_API_KEY:?set PRODIGI_API_KEY}',
  PRODIGI_ENV: '${PRODIGI_ENV:-sandbox}',
  PRINT_SIGNING_SECRET: '${PRINT_SIGNING_SECRET:?set PRINT_SIGNING_SECRET}',
};
JS
fi
(cd "$STAGE" && npm install --omit=dev --no-audit --no-fund >/dev/null)
cd "$STAGE"
$NETLIFY deploy --allow-anonymous --no-build --prod --dir public --functions netlify/functions "$@"
