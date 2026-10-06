import express from 'express';
import path from 'node:path';
import { CONFIG, ROOT, ensureDirs } from './config.js';
import { decodeDesign, encodeDesign, normalizeDesign } from './design.js';
import { renderDesign } from './render.js';
import { renderMockup } from './mockup.js';
import { createCheckoutSession, constructEvent } from './stripe.js';
import { fulfillFromSession } from './fulfill.js';
import { getAllOrders, getOrder } from './orders.js';

ensureDirs();

const app = express();

// Stripe Webhook Endpoint (MUST receive raw body for signature verification)
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      console.warn('[webhook error] Missing stripe-signature header');
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event;
    try {
      event = constructEvent(req.body, signature);
    } catch (err) {
      console.error('[webhook signature verification failed]:', err.message);
      return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` });
    }

    console.log(`[stripe webhook] Event received: ${event.type} (${event.id})`);

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object;
      try {
        const result = await fulfillFromSession(session.id);
        console.log(`[fulfillment result] Session ${session.id}:`, result.ok ? 'SUCCESS' : result.reason);
        return res.json({ received: true, fulfilled: result.ok });
      } catch (err) {
        console.error(`[fulfillment error] Session ${session.id}:`, err.message);
        // Return 500 so Stripe will retry transient errors
        return res.status(500).json({ error: err.message });
      }
    }

    return res.json({ received: true, ignored: event.type });
  }
);

// Standard JSON body parsing for subsequent routes
app.use(express.json());
app.use(express.static(path.join(ROOT, 'public')));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    version: '1.0.0',
    store: 'AstroThread',
    sku: CONFIG.sku,
    publicUrl: CONFIG.publicUrl,
    stripeConfigured: !!CONFIG.stripeSecretKey,
    prodigiConfigured: !!CONFIG.prodigiApiKey,
  });
});

// Create Stripe Checkout Session
app.post('/api/checkout', async (req, res) => {
  try {
    const rawDesign = req.body.design || {};
    const design = normalizeDesign(rawDesign);
    const designToken = encodeDesign(design);

    // Determine public origin
    const publicBase =
      CONFIG.publicUrl ||
      `${req.protocol}://${req.get('host')}`;

    const session = await createCheckoutSession({
      design,
      designToken,
      publicBase,
    });

    console.log(`[checkout created] Session ${session.id} for "${design.inscription}" (${design.locationName})`);
    res.json({
      ok: true,
      id: session.id,
      url: session.url,
      designToken,
    });
  } catch (err) {
    console.error('[checkout error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Order status lookup & return flow
app.get('/api/order/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    // Check if order exists or needs fulfillment
    let order = getOrder(sessionId);
    if (!order || !order.prodigiOrderId) {
      // Attempt idempotent fulfillment
      const result = await fulfillFromSession(sessionId);
      if (result.ok) {
        order = result.order;
      }
    }

    if (!order) {
      return res.status(404).json({ ok: false, error: 'Order not found' });
    }

    res.json({ ok: true, order });
  } catch (err) {
    console.error(`[order lookup error] ${sessionId}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Preview Image (for studio)
app.get('/api/preview', (req, res) => {
  try {
    const token = req.query.token;
    const design = token ? decodeDesign(token) : normalizeDesign(req.query);
    if (!design) return res.status(400).send('Invalid design token');

    const width = Math.min(2400, Math.max(300, Number(req.query.w) || 800));
    const pngBuffer = renderDesign(design, { width });

    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    });
    res.send(pngBuffer);
  } catch (err) {
    console.error('[preview error]:', err.message);
    res.status(500).send('Error generating preview');
  }
});

// Mockup Image (T-shirt preview)
app.get('/api/mockup', (req, res) => {
  try {
    const token = req.query.token;
    const design = token ? decodeDesign(token) : normalizeDesign(req.query);
    if (!design) return res.status(400).send('Invalid design token');

    const width = Math.min(1200, Math.max(300, Number(req.query.w) || 800));
    const height = Math.min(1440, Math.max(360, Number(req.query.h) || 960));
    const pngBuffer = renderMockup(design, { width, height });

    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    });
    res.send(pngBuffer);
  } catch (err) {
    console.error('[mockup error]:', err.message);
    res.status(500).send('Error generating mockup');
  }
});

// High-resolution Print Asset Endpoint for Prodigi
// Full 4,680 × 5,790 px 300 DPI transparent PNG
app.get('/api/print/:token.png', (req, res) => {
  try {
    const token = req.params.token;
    const design = decodeDesign(token);
    if (!design) {
      console.warn('[print asset error] Invalid design token:', token);
      return res.status(400).json({ error: 'Invalid design token' });
    }

    console.log(`[print asset request] Generating 4680x5790 PNG for: "${design.inscription}"`);
    const pngBuffer = renderDesign(design);

    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="astrothread-${design.theme}.png"`,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    res.send(pngBuffer);
  } catch (err) {
    console.error('[print asset generation failed]:', err.message);
    res.status(500).json({ error: 'Failed to generate print asset' });
  }
});

// Admin Orders API
app.get('/api/admin/orders', (req, res) => {
  const orders = getAllOrders();
  res.json({ ok: true, orders });
});

// Storefront Pages
app.get('/', (req, res) => {
  res.sendFile(path.join(ROOT, 'public', 'index.html'));
});

app.get('/checkout/success', (req, res) => {
  res.sendFile(path.join(ROOT, 'public', 'success.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(ROOT, 'public', 'admin.html'));
});

// Start Server if run directly
const server = app.listen(CONFIG.port, '0.0.0.0', () => {
  console.log(`AstroThread server listening on http://localhost:${CONFIG.port}`);
});

export { app, server };
