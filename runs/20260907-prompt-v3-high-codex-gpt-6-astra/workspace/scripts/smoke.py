"""Read-only deployment smoke tests plus rejected checkout/security requests."""
import os, json, urllib.request, urllib.error, urllib.parse, hashlib, hmac, base64, pathlib, struct, uuid
origin = os.environ.get('SMOKE_ORIGIN', 'https://benchmark-20260907-prompt-v3-high-codex-gpt-6-astra.vercel.app')
def request(path, method='GET', data=None, headers=None):
    req = urllib.request.Request(origin+path, data=json.dumps(data).encode() if data is not None else None, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=60) as r: return r.status,r.read(),dict(r.headers)
    except urllib.error.HTTPError as e: return e.code,e.read(),dict(e.headers)
checks=[]
def check(name,condition):
    checks.append({'check':name,'passed':bool(condition)})
    print(('PASS ' if condition else 'FAIL ')+name)
for path in ['/','/order','/policies','/images/black-shirt.png','/favicon.svg']:
    status,body,headers=request(path);content_ok=(b'Personal Orbit' in body or b'PERSONAL ORBIT' in body) if path in ['/', '/order', '/policies'] else (b'<svg' in body if path.endswith('.svg') else body.startswith(b'\x89PNG'));check('Public '+path,status==200 and content_ok)
design={'place':'JOSHUA TREE','date':'2024-08-17','dedication':'RIGHT WHERE WE BELONG','palette':'solar'}
status,body,headers=request('/api/preview?design='+urllib.parse.quote(json.dumps(design)))
check('Personalized outlined SVG preview',status==200 and b'<path' in body and b'<text' not in body and 'image/svg+xml' in headers.get('Content-Type',''))
status,_,_=request('/api/preview?design='+urllib.parse.quote(json.dumps({**design,'place':'<script>'})))
check('Preview rejects invalid content',status==400)
status,_,_=request('/api/art?token=forged.invalid');check('Forged print URL rejected',status==403)
status,_,_=request('/api/checkout','POST',{'design':design,'size':'m','quantity':1,'requestId':str(uuid.uuid4())},{'Origin':'https://untrusted.example','Content-Type':'application/json'})
check('Cross-origin checkout rejected',status==403)
status,_,_=request('/api/checkout','POST',{'design':design,'size':'m','quantity':0,'requestId':str(uuid.uuid4())},{'Origin':origin,'Content-Type':'application/json'})
check('Invalid quantity rejected',status==400)
status,body,_=request('/api/checkout','POST',{'design':design,'size':'m','quantity':1,'requestId':str(uuid.uuid4())},{'Origin':origin,'Content-Type':'application/json'})
check('Missing Stripe connection fails closed with clear message',status==503 and b'Stripe test account' in body)
status,_,_=request('/api/webhooks/stripe','POST',{'type':'checkout.session.completed','data':{'object':{'payment_status':'paid'}}})
check('Unconfigured webhook cannot submit an order',status==503)
# Generate a test artwork capability locally, without manufacturing anything.
# Only developers with the signing secret can mint this; the deployed customer
# path mints it exclusively inside paid fulfillment.
values={}
for line in pathlib.Path('.env.local').read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        k,v=line.split('=',1);values[k]=v.strip('"')
secret=values.get('ART_SIGNING_SECRET')
if secret:
    encode=lambda b:base64.urlsafe_b64encode(b).decode().rstrip('=')
    payload=encode(json.dumps({'v':1,'design':design},separators=(',',':')).encode())
    token=payload+'.'+encode(hmac.new(secret.encode(),('art-v1:'+payload).encode(),hashlib.sha256).digest())
    status,png,_=request('/api/art?token='+token)
    dims=struct.unpack('>II',png[16:24]) if png.startswith(b'\x89PNG') else None
    check('Deployed print asset renders at 4677 x 5881',status==200 and dims==(4677,5881))
    if status==200:pathlib.Path('/tmp/orbit-deployed-print.png').write_bytes(png)
pathlib.Path('smoke-results.json').write_text(json.dumps({'origin':origin,'checks':checks},indent=2)+'\n')
if not all(c['passed'] for c in checks):raise SystemExit(1)
