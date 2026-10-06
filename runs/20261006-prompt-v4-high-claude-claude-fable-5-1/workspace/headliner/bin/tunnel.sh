#!/bin/bash
# Keeps a Cloudflare quick tunnel up for the local server and tells Stripe
# where to send webhooks each time the public hostname changes.
set -u
cd "$(dirname "$0")/.."
PORT="${PORT:-4242}"
NODE="${NODE:-$(command -v node)}"
CF="${CLOUDFLARED:-$(command -v cloudflared || echo /opt/homebrew/bin/cloudflared)}"
while true; do
  "$CF" tunnel --url "http://localhost:$PORT" --no-autoupdate 2>&1 | while IFS= read -r line; do
    printf '%s %s\n' "$(date -u +%FT%TZ)" "$line"
    if [[ "$line" =~ (https://[a-z0-9-]+\.trycloudflare\.com) ]]; then
      "$NODE" bin/set-public-url.js "${BASH_REMATCH[1]}" || echo "set-public-url failed"
    fi
  done
  echo "$(date -u +%FT%TZ) tunnel exited; restarting in 5s"
  sleep 5
done
