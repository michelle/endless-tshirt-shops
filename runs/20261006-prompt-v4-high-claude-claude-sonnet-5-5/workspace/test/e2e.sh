#!/bin/bash
# End-to-end check against a running server: BASE=http://localhost:4317 ./test/e2e.sh
BASE=${BASE:-http://localhost:4317}
BODY='{"items":[{"design":{"name":"Maya","date":"1991-03-14","place":"Lisbon","message":"Always look up","palette":"starlight","labels":true,"variant":0},"color":"black","size":"m","qty":1}],"recipient":{"name":"Ada Lovelace","email":"test-buyer@example.com","phone":"+15125550142","line1":"1100 Congress Ave","city":"Austin","state":"TX","postal":"78701","country":"US"}}'
R=$(curl -s -X POST $BASE/api/checkout -H 'Content-Type: application/json' -d "$BODY"); echo "checkout: $R"
TOKEN=$(echo "$R" | python3 -c "import sys,json,urllib.parse as u;print(u.parse_qs(u.urlparse(json.load(sys.stdin)['redirectUrl']).query)['o'][0])")
echo "--- declined card (must NOT create a print order)"
curl -s -X POST $BASE/api/demo/pay -H 'Content-Type: application/json' -d "{\"o\":\"$TOKEN\",\"card\":{\"number\":\"4000000000000002\",\"exp\":\"12/34\",\"cvc\":\"123\"}}"; echo
echo "--- successful card"
curl -s -X POST $BASE/api/demo/pay -H 'Content-Type: application/json' -d "{\"o\":\"$TOKEN\",\"card\":{\"number\":\"4242 4242 4242 4242\",\"exp\":\"12/34\",\"cvc\":\"123\"}}"; echo
echo "--- paying the same order again (must not duplicate)"
curl -s -X POST $BASE/api/demo/pay -H 'Content-Type: application/json' -d "{\"o\":\"$TOKEN\",\"card\":{\"number\":\"4242424242424242\",\"exp\":\"12/34\",\"cvc\":\"123\"}}"; echo
