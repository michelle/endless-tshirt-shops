// Automated end-to-end verification test suite for AstroThread

import crypto from 'node:crypto';
import { CONFIG } from '../src/config.js';

const baseUrl = CONFIG.publicUrl || `http://localhost:${CONFIG.port}`;
console.log(`[test] Running tests against: ${baseUrl}`);

let failures = 0;
function assert(desc, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${desc}`);
  } else {
    console.error(`  ✗ FAIL: ${desc} ${detail}`);
    failures++;
  }
}

async function runTests() {
  console.log('\n1. Health Check Endpoint');
  try {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const health = await healthRes.json();
    assert('Health returns 200 OK', healthRes.ok);
    assert('Health reports ok: true', health.ok === true);
    assert('Health identifies store as AstroThread', health.store === 'AstroThread');
    assert('Health identifies SKU as GLOBAL-TEE-BC-3001', health.sku === 'GLOBAL-TEE-BC-3001');
    assert('Health reports Stripe configured', health.stripeConfigured === true);
    assert('Health reports Prodigi configured', health.prodigiConfigured === true);
  } catch (err) {
    assert('Health check failed to execute', false, err.message);
  }

  console.log('\n2. Checkout Creation');
  let checkoutData = null;
  try {
    const checkoutRes = await fetch(`${baseUrl}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        design: {
          inscription: 'APOLLO 11 TRANQUILITY',
          date: '1969-07-20',
          time: '20:17',
          locationName: 'HOUSTON, TX',
          lat: 29.7604,
          lon: -95.3698,
          theme: 'gold',
          garment: 'black',
          size: 'l',
        },
      }),
    });
    checkoutData = await checkoutRes.json();
    assert('Checkout returns 200 OK', checkoutRes.ok);
    assert('Checkout returns session URL', typeof checkoutData.url === 'string' && checkoutData.url.startsWith('https://checkout.stripe.com/'));
    assert('Checkout returns session ID', typeof checkoutData.id === 'string' && checkoutData.id.startsWith('cs_test_'));
    assert('Checkout returns design token', typeof checkoutData.designToken === 'string');
  } catch (err) {
    assert('Checkout creation failed to execute', false, err.message);
  }

  console.log('\n3. High-Resolution Print Asset Generation (Prodigi Requirement)');
  if (checkoutData?.designToken) {
    try {
      const printUrl = `${baseUrl}/api/print/${encodeURIComponent(checkoutData.designToken)}.png`;
      const printRes = await fetch(printUrl);
      assert('Print asset returns 200 OK', printRes.ok);
      assert('Print asset Content-Type is image/png', printRes.headers.get('content-type') === 'image/png');

      const arrayBuf = await printRes.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      assert('Print asset is non-empty (>100KB)', buf.length > 100000);

      // Verify PNG magic header: 89 50 4E 47 0D 0A 1A 0A
      const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
      assert('Valid PNG signature', isPng);

      // Read IHDR chunk for width and height (at offsets 16 and 20)
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      assert('Width matches Prodigi Bella Canvas print area (4680px)', width === 4680);
      assert('Height matches Prodigi Bella Canvas print area (5790px)', height === 5790);
    } catch (err) {
      assert('Print asset check failed', false, err.message);
    }
  }

  console.log('\n4. Payment Gating (Security Requirement)');
  if (checkoutData?.id) {
    try {
      const orderRes = await fetch(`${baseUrl}/api/order/${checkoutData.id}`);
      const orderData = await orderRes.json();
      assert('Unpaid session is NOT fulfilled in Prodigi', orderData.ok === false);
    } catch (err) {
      assert('Payment gating check failed', false, err.message);
    }
  }

  console.log('\n5. Webhook Signature Verification');
  try {
    const payload = JSON.stringify({
      id: 'evt_sig_test_' + Date.now(),
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_fake', payment_status: 'unpaid' } },
    });

    const badSigRes = await fetch(`${baseUrl}/api/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=12345,v1=bad_signature_hash',
      },
      body: payload,
    });
    assert('Tampered/invalid webhook signature rejected with 400', badSigRes.status === 400);

    if (CONFIG.stripeWebhookSecret) {
      const t = Math.floor(Date.now() / 1000);
      const validSig = crypto
        .createHmac('sha256', CONFIG.stripeWebhookSecret)
        .update(`${t}.${payload}`)
        .digest('hex');

      const goodSigRes = await fetch(`${baseUrl}/api/webhooks/stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': `t=${t},v1=${validSig}`,
        },
        body: payload,
      });
      assert('Authentic webhook signature accepted through auth check', goodSigRes.status !== 400);
    }
  } catch (err) {
    assert('Webhook signature check failed', false, err.message);
  }

  console.log('\n6. Admin Operations Endpoint');
  try {
    const adminRes = await fetch(`${baseUrl}/api/admin/orders`);
    const adminData = await adminRes.json();
    assert('Admin orders endpoint returns 200 OK', adminRes.ok);
    assert('Admin reports orders list', Array.isArray(adminData.orders));
    assert('Admin includes fulfilled test orders', adminData.orders.length > 0);
  } catch (err) {
    assert('Admin check failed', false, err.message);
  }

  console.log('\n' + '='.repeat(50));
  if (failures === 0) {
    console.log(' ALL END-TO-END AUTOMATED CHECKS PASSED!');
    console.log('='.repeat(50) + '\n');
    process.exit(0);
  } else {
    console.error(` TEST SUITE COMPLETED WITH ${failures} FAILURE(S)`);
    console.log('='.repeat(50) + '\n');
    process.exit(1);
  }
}

runTests();
