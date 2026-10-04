#!/usr/bin/env bash
# Deploys to a claimable, login-free Vercel deployment and wires up the Stripe webhook.
#   ENV_FILE=../parks.env scripts/deploy-temporary.sh [--fresh]
# --fresh starts a new anonymous Vercel project (new URL, new 60-minute claim window).
# Once you've claimed the project / logged in to Vercel, use the README's production steps instead.
set -euo pipefail
cd "$(dirname "$0")/.."
ENV_FILE="${ENV_FILE:-../parks.env}"
set -a; . "$ENV_FILE"; set +a
: "${STRIPE_SECRET_KEY:?}" "${PRODIGI_API_KEY:?}" "${PRINT_SIGNING_SECRET:?}"
[[ "${1:-}" == "--fresh" ]] && rm -f .vercel/anonymous.json

deploy() {
  rm -rf .vercel/output .next
  npx -y vercel@latest deploy --temporary --yes \
    -e STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
    -e PRODIGI_API_KEY="$PRODIGI_API_KEY" \
    -e PRINT_SIGNING_SECRET="$PRINT_SIGNING_SECRET" \
    "$@" > /tmp/parks-deploy.log 2>&1 || { tail -20 /tmp/parks-deploy.log; exit 1; }
  python3 -c '
import json,re,sys
t=open("/tmp/parks-deploy.log").read()
d=json.loads(re.search(r"\{\s*\"status\".*\}", t, re.S).group(0))
assert d["status"]=="ok", d
print(d["deployment"]["url"], d["deployment"]["claimUrl"], d["deployment"]["expiresAt"])'
}

read -r URL CLAIM EXPIRES < <(deploy)
echo "Deployed $URL"

# (Re)create the Stripe webhook for this URL — Stripe only reveals the signing secret on creation.
HOOK="$URL/api/webhooks/stripe"
for id in $(curl -s -u "$STRIPE_SECRET_KEY:" "https://api.stripe.com/v1/webhook_endpoints?limit=100" |
  python3 -c "import json,sys; print(' '.join(e['id'] for e in json.load(sys.stdin)['data'] if e['url']==sys.argv[1]))" "$HOOK"); do
  curl -s -u "$STRIPE_SECRET_KEY:" -X DELETE "https://api.stripe.com/v1/webhook_endpoints/$id" > /dev/null
done
WHSEC=$(curl -s -u "$STRIPE_SECRET_KEY:" https://api.stripe.com/v1/webhook_endpoints \
  -d url="$HOOK" -d description="Personal Parks Service fulfilment" \
  -d "enabled_events[]=checkout.session.completed" -d "enabled_events[]=checkout.session.async_payment_succeeded" |
  python3 -c "import json,sys; print(json.load(sys.stdin)['secret'])")
echo "Stripe webhook → $HOOK"

read -r URL2 CLAIM EXPIRES < <(deploy -e STRIPE_WEBHOOK_SECRET="$WHSEC" -e PUBLIC_BASE_URL="$URL")
[[ "$URL2" == "$URL" ]] || { echo "URL changed on redeploy ($URL2) — rerun"; exit 1; }
echo
echo "Store:      $URL"
echo "Claim URL:  $CLAIM"
echo "Expires:    $(python3 -c "import datetime,sys; print(datetime.datetime.fromtimestamp(int(sys.argv[1])/1000))" "$EXPIRES") unless claimed"
