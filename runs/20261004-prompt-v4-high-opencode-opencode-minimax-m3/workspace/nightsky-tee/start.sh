#!/usr/bin/env bash
# Start NightSky Tee: launches cloudflared, waits for URL, launches server,
# then BLOCKS forever so the children stay parented to this script.
# Opencode runs this as a background task; the script is meant never to
# return until killed.

set -e
cd "$(dirname "$0")"
LOG_DIR="$(pwd)/data"
mkdir -p "$LOG_DIR"

# 0. Save current URL if any, prefer it (lets you restart tunnel keeping URL).
# Quick-Tunnel URLs only last as long as the process — so we generate fresh
# each time.

# 1. Kill anything stale
pkill -f "node server.js" 2>/dev/null || true
pkill -f "cloudflared tunnel --url http://localhost:8787" 2>/dev/null || true
sleep 1

# 2. Launch cloudflared (background, fully detached via nohup + < /dev/null)
nohup ~/bin/cloudflared tunnel --url http://localhost:8787 --no-autoupdate \
    < /dev/null > "$LOG_DIR/cloudflared.log" 2>&1 &
disown
echo $! > "$LOG_DIR/cloudflared.pid"
echo "cloudflared launched"

# 3. Wait for URL
URL=""
for i in $(seq 1 30); do
    URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_DIR/cloudflared.log" 2>/dev/null | head -1 || true)
    if [ -n "$URL" ]; then
        break
    fi
    sleep 1
done
if [ -z "$URL" ]; then
    echo "ERROR: never got a tunnel URL" >&2
    tail -20 "$LOG_DIR/cloudflared.log"
    exit 1
fi
echo "PUBLIC URL: $URL"
echo "$URL" > "$LOG_DIR/public_url"

# 4. Update .env so dotenv.js sees the new URL
sed -i '' "s|^PUBLIC_URL=.*$|PUBLIC_URL=$URL|" .env
echo ".env updated to PUBLIC_URL=$URL"

# 5. Launch server (also fully detached)
env PUBLIC_URL="$URL" nohup node server.js \
    < /dev/null > "$LOG_DIR/server.log" 2>&1 &
disown
echo $! > "$LOG_DIR/server.pid"
echo "server launched"

# 6. Wait briefly and verify
sleep 4
echo "--- Health probe ---"
curl -s -o "$LOG_DIR/health.json" -w "HTTP %{http_code}\n" "$URL/api/health" -m 8 || echo "(no response yet)"
cat "$LOG_DIR/health.json" 2>/dev/null
echo

echo "READY"
echo "  URL:    $URL"
echo "  Health: $URL/api/health"
echo "  Logs:   $LOG_DIR/"
echo
echo "This script will block forever; press Ctrl-C to stop the stack."

# Block forever — keeps parent alive so children stay alive too.
tail -f "$LOG_DIR/server.log" "$LOG_DIR/cloudflared.log"
