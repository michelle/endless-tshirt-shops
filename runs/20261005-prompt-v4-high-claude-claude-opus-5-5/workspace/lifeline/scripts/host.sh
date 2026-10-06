#!/bin/bash
# Self-host: runs the Node server (auto-restarting) behind a Cloudflare quick tunnel,
# which gives a public https://*.trycloudflare.com URL with no account needed.
# The URL lasts as long as this process runs; it changes if the tunnel restarts.
#   start:  scripts/host.sh            (writes the public URL to .host/url.txt)
#   stop:   kill "$(cat .host/pid)"
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p .host
PORT="${PORT:-3456}"
CLOUDFLARED="${CLOUDFLARED:-./bin/cloudflared}"
echo $$ > .host/pid
trap 'kill 0' EXIT

( while true; do PORT=$PORT node scripts/server.mjs >> .host/server.log 2>&1; echo "server exited, restarting" >> .host/server.log; sleep 2; done ) &

( while true; do
    "$CLOUDFLARED" tunnel --no-autoupdate --url "http://localhost:$PORT" 2>&1 | while IFS= read -r line; do
      echo "$line" >> .host/tunnel.log
      url=$(echo "$line" | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com')
      [ -n "$url" ] && echo "$url" > .host/url.txt
    done
    echo "tunnel exited, restarting" >> .host/tunnel.log; sleep 5
  done ) &

wait
