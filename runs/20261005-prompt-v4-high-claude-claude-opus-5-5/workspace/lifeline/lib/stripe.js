// Minimal Stripe REST client (no SDK needed in a serverless function).
import { config } from './config.js';

function encode(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') encode(v, key, out);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
  }
  return out;
}

export async function stripe(method, path, params) {
  if (!config.stripeSecretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  let url = `https://api.stripe.com/v1${path}`;
  const init = { method, headers: { Authorization: `Bearer ${config.stripeSecretKey}` } };
  if (params && method === 'GET') url += `?${encode(params).join('&')}`;
  else if (params) {
    init.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    init.body = encode(params).join('&');
  }
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) {
    const e = new Error(`Stripe ${method} ${path}: ${data?.error?.message ?? res.status}`);
    e.status = res.status;
    throw e;
  }
  return data;
}
