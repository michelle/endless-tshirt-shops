#!/bin/bash
set -a
. ~/.tshirt-secrets/stripe.env
[ -f .env.local ] && . .env.local
set +a
export PUBLIC_URL="${PUBLIC_URL:-http://localhost:8787}"
export PORT="${PORT:-8787}"
exec node server/index.js
