#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-8788}"
mkdir -p runtime data

CF=""
for candidate in "$HOME/bin/cloudflared" /opt/homebrew/bin/cloudflared /usr/local/bin/cloudflared "$(command -v cloudflared 2>/dev/null || true)"; do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then
    CF="$candidate"
    break
  fi
done

if [ -z "$CF" ]; then
  echo "Error: cloudflared binary not found" >&2
  exit 1
fi

echo "==> Using cloudflared: $CF"

# Kill any existing server or tunnel instances from previous runs
pkill -f "cloudflared tunnel --no-autoupdate --url http://127.0.0.1:$PORT" 2>/dev/null || true
pkill -f "cloudflared tunnel --no-autoupdate --url http://localhost:$PORT" 2>/dev/null || true
pkill -f "node src/server.js" 2>/dev/null || true
sleep 1

# Start cloudflared quick tunnel
echo "==> Starting Cloudflare quick tunnel to http://127.0.0.1:$PORT..."
: > runtime/tunnel.log
nohup "$CF" tunnel --no-autoupdate --url "http://127.0.0.1:$PORT" > runtime/tunnel.log 2>&1 &
CF_PID=$!

PUBLIC_URL=""
for i in $(seq 1 45); do
  PUBLIC_URL="$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' runtime/tunnel.log | head -1 || true)"
  if [ -n "$PUBLIC_URL" ]; then
    break
  fi
  sleep 1
done

if [ -z "$PUBLIC_URL" ]; then
  echo "Error: Failed to obtain Cloudflare tunnel URL. Log output:" >&2
  cat runtime/tunnel.log >&2
  kill "$CF_PID" 2>/dev/null || true
  exit 1
fi

echo "==> Public tunnel URL established: $PUBLIC_URL"
echo "$PUBLIC_URL" > runtime/public_url.txt

# Extract Stripe Key from BENCHMARK_CLI_STATE or environment
SK="${STRIPE_SECRET_KEY:-}"
PK="${STRIPE_PUBLISHABLE_KEY:-}"

if [ -z "$SK" ] && [ -n "${BENCHMARK_CLI_STATE:-}" ] && [ -f "$BENCHMARK_CLI_STATE" ]; then
  SK="$(grep 'test_mode_api_key' "$BENCHMARK_CLI_STATE" | head -1 | sed -E "s/.*['\"]([^'\"]+)['\"].*/\1/")"
  PK="$(grep 'test_mode_pub_key' "$BENCHMARK_CLI_STATE" | head -1 | sed -E "s/.*['\"]([^'\"]+)['\"].*/\1/")"
fi

WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-}"

if [ -n "$SK" ]; then
  echo "==> Registering Stripe Webhook endpoint for $PUBLIC_URL..."
  # Clean up existing webhooks for previous tunnels to prevent clutter
  OLD_HOOKS="$(curl -s -u "$SK:" "https://api.stripe.com/v1/webhook_endpoints?limit=10" | grep -oE 'we_[a-zA-Z0-9]+' || true)"
  for hook in $OLD_HOOKS; do
    curl -s -X DELETE -u "$SK:" "https://api.stripe.com/v1/webhook_endpoints/$hook" >/dev/null 2>&1 || true
  done

  # Create fresh webhook endpoint
  HOOK_RESP="$(curl -s -u "$SK:" https://api.stripe.com/v1/webhook_endpoints \
    -d "url=$PUBLIC_URL/api/webhooks/stripe" \
    -d "enabled_events[]=checkout.session.completed" \
    -d "enabled_events[]=checkout.session.async_payment_succeeded" \
    -d "description=AstroThread Live Deployment")"

  NEW_SECRET="$(echo "$HOOK_RESP" | grep -oE 'whsec_[a-zA-Z0-9]+' | head -1 || true)"
  if [ -n "$NEW_SECRET" ]; then
    WEBHOOK_SECRET="$NEW_SECRET"
    echo "==> Stripe webhook registered successfully (secret: ${WEBHOOK_SECRET:0:10}...)"
  else
    echo "Notice: Webhook registration response: $HOOK_RESP"
  fi
fi

# Write .env file
cat << EOF > .env
PORT=$PORT
PUBLIC_URL=$PUBLIC_URL
STRIPE_SECRET_KEY=$SK
STRIPE_PUBLISHABLE_KEY=$PK
STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET
PRODIGI_API_KEY=${PRODIGI_API_KEY:-}
PRODIGI_BASE=${PRODIGI_BASE:-https://api.sandbox.prodigi.com/v4.0}
PRODIGI_SKU=GLOBAL-TEE-BC-3001
ADMIN_KEY=astro-admin-secret-2026
EOF

# Start the AstroThread application server
echo "==> Starting AstroThread Node.js server..."
: > runtime/server.log
PORT="$PORT" \
PUBLIC_URL="$PUBLIC_URL" \
STRIPE_SECRET_KEY="$SK" \
STRIPE_PUBLISHABLE_KEY="$PK" \
STRIPE_WEBHOOK_SECRET="$WEBHOOK_SECRET" \
PRODIGI_API_KEY="${PRODIGI_API_KEY:-}" \
nohup node src/server.js > runtime/server.log 2>&1 &
SERVER_PID=$!

echo "==> Server process started (PID: $SERVER_PID)"

# Verify local health check
sleep 2
echo "==> Verifying local health..."
curl -s "http://127.0.0.1:$PORT/api/health" || true
echo ""

# Verify public accessibility over Cloudflare tunnel
echo "==> Verifying public tunnel accessibility ($PUBLIC_URL)..."
HEALTH_CHECK=""
for i in $(seq 1 20); do
  HEALTH_CHECK="$(curl -s -m 10 "$PUBLIC_URL/api/health" || true)"
  if echo "$HEALTH_CHECK" | grep -q '"ok":true'; then
    break
  fi
  sleep 1
done

echo "Health Response: $HEALTH_CHECK"

if echo "$HEALTH_CHECK" | grep -q '"ok":true'; then
  echo ""
  echo "=========================================================="
  echo "  ASTROTHREAD STORE DEPLOYED SUCCESSFULLY!"
  echo "  Storefront URL:  $PUBLIC_URL"
  echo "  Admin Portal:    $PUBLIC_URL/admin"
  echo "  Health Endpoint: $PUBLIC_URL/api/health"
  echo "=========================================================="
else
  echo "Warning: Public health check did not return ok:true within timeout"
fi
