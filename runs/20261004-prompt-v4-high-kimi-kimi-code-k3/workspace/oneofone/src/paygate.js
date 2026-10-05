'use strict';

// PayGate PayWeb3 (DPO) hosted-checkout integration.
// Uses PayGate's published public sandbox credentials (PayGate ID 10011072130,
// key "secret") so the demo works without a merchant account; production uses
// the merchant's own ID + encryption key from config.
// Docs: https://docs.paygate.co.za/paygate-by-network/reference/
const crypto = require('crypto');

const HOST = 'https://secure.paygate.co.za/payweb3';

const ISO3 = { US: 'USA', GB: 'GBR', CA: 'CAN', AU: 'AUS', DE: 'DEU', FR: 'FRA', NL: 'NLD', IE: 'IRL', ES: 'ESP', IT: 'ITA' };

function md5(s) {
  return crypto.createHash('md5').update(s, 'utf8').digest('hex');
}

function txDate() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// Step 1 (server): initiate the transaction, get a PAY_REQUEST_ID.
async function initiate(cfg, order, amountUsd, urls) {
  const fields = {
    PAYGATE_ID: cfg.id,
    REFERENCE: order.id,
    AMOUNT: String(Math.round(amountUsd * 100)), // cents
    CURRENCY: 'USD',
    RETURN_URL: urls.returnUrl,
    TRANSACTION_DATE: txDate(),
    LOCALE: 'en-za',
    COUNTRY: ISO3[order.recipient.countryCode] || 'USA',
    EMAIL: order.recipient.email,
    NOTIFY_URL: urls.notifyUrl,
  };
  // checksum over values in field order + encryption key
  const withChecksum = { ...fields, CHECKSUM: md5(Object.values(fields).join('') + cfg.key) };
  const res = await fetch(`${HOST}/initiate.trans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(withChecksum).toString(),
  });
  const text = await res.text();
  const data = Object.fromEntries(new URLSearchParams(text));
  if (!data.PAY_REQUEST_ID) throw new Error(`PayGate initiate failed: ${text.slice(0, 300)}`);
  return {
    action: `${HOST}/process.trans`,
    params: { PAYGATE_ID: data.PAYGATE_ID, PAY_REQUEST_ID: data.PAY_REQUEST_ID, CHECKSUM: data.CHECKSUM },
    payRequestId: data.PAY_REQUEST_ID,
  };
}

// Server-side source of truth for the transaction status.
async function queryStatus(cfg, order) {
  const fields = {
    PAYGATE_ID: cfg.id,
    PAY_REQUEST_ID: order.payment.payRequestId,
    REFERENCE: order.id,
  };
  const body = { ...fields, CHECKSUM: md5(Object.values(fields).join('') + cfg.key) };
  const res = await fetch(`${HOST}/query.trans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });
  const text = await res.text();
  const data = Object.fromEntries(new URLSearchParams(text));
  if (data.ERROR) throw new Error(`PayGate query failed: ${text.slice(0, 300)}`);
  return data; // TRANSACTION_STATUS: 1 approved, 2 declined, 0/4 pending, 5 cancelled
}

module.exports = { initiate, queryStatus };
