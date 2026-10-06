// Netlify adapter: routes /api/<name> to the platform-neutral handlers in /api,
// translating a Web Request into the small req/res surface they use.
import checkout from '../../api/checkout.js';
import order from '../../api/order.js';
import print from '../../api/print.js';
import shipping from '../../api/shipping.js';
import webhook from '../../api/stripe-webhook.js';

const ROUTES = { checkout, order, print, shipping, 'stripe-webhook': webhook };

export default async (request) => {
  const url = new URL(request.url);
  const handler = ROUTES[url.pathname.replace(/^\/api\//, '').replace(/\/$/, '')];
  if (!handler) return new Response('Not found', { status: 404 });

  const headers = Object.fromEntries([...request.headers].map(([k, v]) => [k.toLowerCase(), v]));
  headers.host ??= url.host;
  const req = {
    method: request.method,
    url: url.pathname + url.search,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text(),
  };

  return new Promise((resolve, reject) => {
    const out = new Headers();
    const res = {
      statusCode: 200,
      setHeader: (k, v) => out.set(k, String(v)),
      end: (body) => resolve(new Response(body ?? null, { status: res.statusCode, headers: out })),
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
};

export const config = { path: '/api/*' };
