#!/usr/bin/env bash
# End-to-end check against a deployed store.  SITE=https://... ./scripts/e2e.sh
set -uo pipefail
pass=0; fail=0
chk() { if [ "$2" = "$3" ]; then echo "  ok   $1 ($2)"; pass=$((pass+1)); else echo "  FAIL $1: got '$2' want '$3'"; fail=$((fail+1)); fi; }
code() { curl -s -o /dev/null -w "%{http_code}" "$1"; }

echo "== pages =="
chk "landing"   "$(code "$SITE/")" 200
chk "design"    "$(code "$SITE/design")" 200
chk "404"       "$(code "$SITE/nope")" 404
chk "health"    "$(code "$SITE/api/health")" 200
chk "bad art"   "$(code "$SITE/api/art/forged.png")" 404

echo "== full purchase =="
SPEC='{"spec":{"v":1,"title":"DAD AT SIXTY","subtitle":"ALL LINES RUNNING ON TIME","motto":"still no delays","garment":"navy blue","size":"xl","variant":2,"backPrint":true,"lines":[{"name":"Early Years","color":"#E8453C","stations":[{"label":"Dundee","note":"1966"},{"label":"Paper Round","note":"1978"},{"label":"Art School","note":"1986","major":true},{"label":"London","note":"1989"}]},{"name":"Family","color":"#F2A93B","stations":[{"label":"Meeting Mum","note":"1991"},{"label":"London"},{"label":"Me","note":"1995"},{"label":"The Allotment","note":"2011"}]},{"name":"Work","color":"#37B98A","stations":[{"label":"Art School"},{"label":"First Agency","note":"1990"},{"label":"His Own Shop","note":"2004"},{"label":"Retired","note":"2026"}]}]},"qty":2,"shipping":"express"}'
OUT=$(curl -s -X POST "$SITE/api/checkout" -H 'content-type: application/json' -d "$SPEC")
REF=$(echo "$OUT" | python3 -c "import sys,json;print(json.load(sys.stdin)['ref'])")
URL=$(echo "$OUT" | python3 -c "import sys,json;print(json.load(sys.stdin)['url'])")
TOKEN=${URL##*/pay/}
chk "checkout mode" "$(echo "$OUT" | python3 -c "import sys,json;print(json.load(sys.stdin)['mode'])")" sandbox
chk "pay page" "$(code "$URL")" 200

echo "  -- rejects bad cards before touching the printer --"
for card in "4000000000000002:card_declined" "4000000000009995:insufficient_funds" "1234567812345678:invalid_number"; do
  num=${card%%:*}; want=${card##*:}
  got=$(curl -s -X POST "$SITE/api/demo/pay" -H 'content-type: application/json' \
    -d "{\"token\":\"$TOKEN\",\"email\":\"a@b.co\",\"address\":{\"name\":\"T\",\"line1\":\"1 A St\",\"city\":\"Springfield\",\"state\":\"OR\",\"postal\":\"97403\",\"country\":\"US\"},\"card\":{\"name\":\"T\",\"number\":\"$num\",\"exp\":\"12/34\",\"cvc\":\"123\"}}" \
    | python3 -c "import sys,json;print(json.load(sys.stdin).get('code','?'))")
  chk "card $num" "$got" "$want"
done
chk "no order yet" "$(curl -s "$SITE/api/order/$REF" | python3 -c "import sys,json;print(json.load(sys.stdin)['found'])")" False

echo "  -- bad address is rejected --"
got=$(curl -s -X POST "$SITE/api/demo/pay" -H 'content-type: application/json' \
  -d "{\"token\":\"$TOKEN\",\"email\":\"not-an-email\",\"address\":{\"name\":\"T\",\"line1\":\"1 A St\",\"city\":\"S\",\"postal\":\"9\",\"country\":\"US\"},\"card\":{\"name\":\"T\",\"number\":\"4242424242424242\",\"exp\":\"12/34\",\"cvc\":\"123\"}}" \
  -o /dev/null -w "%{http_code}")
chk "bad email" "$got" 400

echo "  -- successful payment --"
PAID=$(curl -s -X POST "$SITE/api/demo/pay" -H 'content-type: application/json' \
  -d "{\"token\":\"$TOKEN\",\"email\":\"analogmidnight@gmail.com\",\"phone\":\"+15550100000\",\"address\":{\"name\":\"Alan Ferrier\",\"line1\":\"12 Magdalen Road\",\"city\":\"Oxford\",\"state\":\"Oxfordshire\",\"postal\":\"OX4 1RB\",\"country\":\"GB\"},\"card\":{\"name\":\"A FERRIER\",\"number\":\"4242424242424242\",\"exp\":\"12/34\",\"cvc\":\"123\"}}")
echo "     $PAID"
chk "prodigi order created" "$(echo "$PAID" | python3 -c "import sys,json;print(bool(json.load(sys.stdin).get('prodigiOrderId')))")" True
chk "order page" "$(code "$SITE/order/$REF")" 200
echo "$REF" > /tmp/ix.ref
echo
echo "passed=$pass failed=$fail"
