#!/usr/bin/env bash
# Start Echoform and expose it publicly through a Cloudflare quick tunnel.
# Writes the public URL to runtime/public_url.txt so the server can build
# absolute asset URLs and register its Stripe webhook.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-8788}"
mkdir -p runtime

CF="$(command -v cloudflared || echo /opt/homebrew/bin/cloudflared)"
if [ ! -x "$CF" ]; then
  echo "cloudflared not found; install it or set up a different tunnel." >&2
  exit 1
fi

echo "Starting tunnel -> http://localhost:$PORT"
nohup "$CF" tunnel --no-autoupdate --url "http://localhost:$PORT" > runtime/tunnel.log 2>&1 &
TUNNEL_PID=$!

URL=""
for _ in $(seq 1 40); do
  URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' runtime/tunnel.log | head -1 || true)"
  [ -n "$URL" ] && break
  sleep 1
done

if [ -z "$URL" ]; then
  echo "Could not determine tunnel URL; see runtime/tunnel.log" >&2
  exit 1
fi

echo "$URL" > runtime/public_url.txt
echo "Public URL: $URL"

pkill -f "node src/server.js" 2>/dev/null || true
sleep 1
PUBLIC_URL="$URL" PORT="$PORT" nohup node src/server.js > runtime/server.log 2>&1 &
echo "Server started (pid $!). Tunnel pid $TUNNEL_PID."
echo "Store: $URL"
