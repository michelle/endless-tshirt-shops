#!/bin/bash
# Self-host: runs the store (auto-restarting) behind a Cloudflare quick tunnel,
# which gives a public https://*.trycloudflare.com URL with no account needed.
# The URL lasts as long as this process runs and changes if the tunnel restarts
# — so whenever a new URL appears, the Stripe webhook is re-pointed at it.
#   start:  scripts/host.sh   (writes the public URL to .host/url.txt, logs to .host/)
#   stop:   kill "$(cat .host/pid)"
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p .host
PORT="${PORT:-3457}"
CLOUDFLARED="${CLOUDFLARED:-./bin/cloudflared}"
echo $$ > .host/pid
trap 'kill 0' EXIT

( while true; do
    PORT=$PORT node server.mjs >> .host/server.log 2>&1
    echo "server exited ($?), restarting" >> .host/server.log
    sleep 2
  done ) &

( while true; do
    "$CLOUDFLARED" tunnel --no-autoupdate --url "http://localhost:$PORT" 2>&1 | while IFS= read -r line; do
      echo "$line" >> .host/tunnel.log
      url=$(echo "$line" | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com')
      if [ -n "$url" ] && [ "$url" != "$(cat .host/url.txt 2>/dev/null)" ]; then
        echo "$url" > .host/url.txt
        echo "$(date -u +%FT%TZ) new public URL: $url" >> .host/server.log
        # re-point the Stripe webhook at the new URL (secret persists)
        node scripts/register-webhook.mjs "$url" >> .host/server.log 2>&1 \
          && echo "$(date -u +%FT%TZ) stripe webhook → $url/api/stripe-webhook" >> .host/server.log \
          || echo "$(date -u +%FT%TZ) webhook registration FAILED (server keeps running)" >> .host/server.log
      fi
    done
    echo "tunnel exited ($?), restarting" >> .host/tunnel.log
    sleep 5
  done ) &

wait
