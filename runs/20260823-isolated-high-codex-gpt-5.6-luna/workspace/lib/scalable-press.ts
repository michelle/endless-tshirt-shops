import sharp from 'sharp';

const API_URL = 'https://api.scalablepress.com/v2';
// Both SKUs are verified against the current Scalable Press test catalog.
const products = { fitted: 'gildan-softstyle-t-shirt', unisex: 'next-level-fitted-crew' } as const;
const sizes = { S: 'sml', M: 'med', L: 'lrg', XL: 'xlg' } as const;

type OrderInput = { fit: keyof typeof products; size: keyof typeof sizes; timestamp: string; address: Record<string, string> };

function authHeaders() {
  if (!process.env.SP_AUTH) throw new Error('SP_AUTH is not configured.');
  return { Authorization: `Basic ${Buffer.from(`:${process.env.SP_AUTH}`).toString('base64')}` };
}

async function spFetch(path: string, init: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { ...authHeaders(), ...(init.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || (typeof payload.statusCode === 'number' && payload.statusCode >= 300)) {
    throw new Error(`Scalable Press ${path} failed (${response.status}): ${JSON.stringify(payload).slice(0, 500)}`);
  }
  return payload;
}

function artworkSvg(timestamp: string) {
  const date = new Date(timestamp);
  const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date);
  const timeLabel = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' }).format(date);
  const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1800" viewBox="0 0 2400 1800"><rect width="2400" height="1800" fill="none"/><g fill="#fff" text-anchor="middle" font-family="Arial,Helvetica,sans-serif"><text x="1200" y="680" font-size="210">${dateLabel}</text><text x="1200" y="940" font-size="310">${timeLabel}</text><text x="1200" y="1110" font-size="110" letter-spacing="16">${ms}</text></g></svg>`;
}

export async function createScalablePressOrder(input: OrderInput) {
  const artwork = await sharp(Buffer.from(artworkSvg(input.timestamp))).png().toBuffer();
  const form = new FormData();
  form.append('type', 'dtg');
  form.append('sides[front][artwork]', new Blob([artwork], { type: 'image/png' }), 'datetime.png');
  form.append('sides[front][dimensions][width]', '8');
  form.append('sides[front][position][horizontal]', 'C');
  form.append('sides[front][position][offset][top]', '3');
  const design = await spFetch('/design', { method: 'POST', body: form });
  const quoteForm = new URLSearchParams({
    type: 'dtg',
    'products[0][id]': products[input.fit],
    'products[0][color]': 'Black',
    'products[0][quantity]': '1',
    'products[0][size]': sizes[input.size],
    'designId': design.designId,
    'address[name]': input.address.name,
    'address[address1]': input.address.address1,
    'address[address2]': input.address.address2,
    'address[city]': input.address.city,
    'address[state]': input.address.state,
    'address[zip]': input.address.zip,
    'address[country]': input.address.country || 'US',
  });
  const quote = await spFetch('/quote', { method: 'POST', body: quoteForm });
  if (!quote.orderToken) throw new Error(`Scalable Press returned no order token: ${JSON.stringify(quote.orderIssues || quote).slice(0, 500)}`);
  const order = await spFetch('/order', {
    method: 'POST',
    body: new URLSearchParams({ orderToken: quote.orderToken }),
  });
  return { designId: design.designId, orderToken: quote.orderToken, orderId: order.orderId };
}
