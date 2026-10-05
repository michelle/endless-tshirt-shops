#!/usr/bin/env bash
# start.sh — Launch Celestia Storefront, Cloudflare Quick Tunnel, and register Stripe Webhook

set -e
cd "$(dirname "$0")"

mkdir -p data

echo "=== Starting Celestia Starmap T-Shirt Store ==="

# 1. Terminate any previous runs on port 3000
pkill -f "node server.js" 2>/dev/null || true
pkill -f "cloudflared tunnel --url http://localhost:3000" 2>/dev/null || true
sleep 1

# 2. Extract Stripe secret key from benchmark CLI config if not in env
if [ -z "$STRIPE_SECRET_KEY" ] && [ -n "$BENCHMARK_CLI_STATE" ] && [ -f "$BENCHMARK_CLI_STATE" ]; then
  STRIPE_SECRET_KEY=$(grep test_mode_api_key "$BENCHMARK_CLI_STATE" | cut -d"'" -f2)
fi
if [ -z "$STRIPE_SECRET_KEY" ] && [ -f "$HOME/.bench-secrets/sk" ]; then
  STRIPE_SECRET_KEY=$(cat "$HOME/.bench-secrets/sk" | tr -d '[:space:]')
fi
export STRIPE_SECRET_KEY

# 3. Start Cloudflare Tunnel
echo "Starting Cloudflare Quick Tunnel..."
/opt/homebrew/bin/cloudflared tunnel --url http://localhost:3000 --no-autoupdate > data/cloudflared.log 2>&1 &
CF_PID=$!
echo $CF_PID > data/cloudflared.pid

# 4. Wait for Public Tunnel URL
PUBLIC_URL=""
for i in $(seq 1 40); do
  PUBLIC_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' data/cloudflared.log 2>/dev/null | head -1 || true)
  if [ -n "$PUBLIC_URL" ]; then
    break
  fi
  sleep 1
done

if [ -z "$PUBLIC_URL" ]; then
  echo "Error: Failed to obtain Cloudflare tunnel URL" >&2
  cat data/cloudflared.log
  exit 1
fi

echo "Public Deployment URL: $PUBLIC_URL"
echo "$PUBLIC_URL" > data/public_url
export PUBLIC_URL

# 5. Register Stripe Webhook Endpoint targeting the live tunnel
if [ -n "$STRIPE_SECRET_KEY" ]; then
  echo "Registering Stripe Webhook endpoint at $PUBLIC_URL/webhook/stripe..."
  WH_RES=$(curl -s -u "$STRIPE_SECRET_KEY:" https://api.stripe.com/v1/webhook_endpoints \
    -d "url=$PUBLIC_URL/webhook/stripe" \
    -d "enabled_events[]=checkout.session.completed" \
    -d "enabled_events[]=payment_intent.succeeded" \
    -d "description=Celestia Live Tunnel Webhook")
  
  STRIPE_WEBHOOK_SECRET=$(echo "$WH_RES" | grep -oE '"secret": "whsec_[^"]+"' | cut -d'"' -f4 || true)
  if [ -n "$STRIPE_WEBHOOK_SECRET" ]; then
    echo "Stripe Webhook Secret registered: ${STRIPE_WEBHOOK_SECRET:0:12}..."
    export STRIPE_WEBHOOK_SECRET
  fi
fi

# Write environment file
cat > .env <<EOF
PORT=3000
PUBLIC_URL=$PUBLIC_URL
PRODIGI_API_KEY=$PRODIGI_API_KEY
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
EOF

# 6. Start Node Server
echo "Starting Node.js application server..."
node server.js > data/server.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > data/server.pid
sleep 3

# 7. Health Probe
echo "Probing application health at $PUBLIC_URL/api/health..."
curl -sS "$PUBLIC_URL/api/health" | head -c 300
echo

echo "=== Celestia Stack Deployed and Online ==="
echo "Live URL: $PUBLIC_URL"
