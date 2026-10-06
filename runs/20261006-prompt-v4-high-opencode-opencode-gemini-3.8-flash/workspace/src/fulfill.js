import { CONFIG } from './config.js';
import { CATALOG } from './catalog.js';
import { decodeDesign } from './design.js';
import { retrieveSession } from './stripe.js';
import { createOrder, findOrderId } from './prodigi.js';
import { getOrder, saveOrder } from './orders.js';

// In-process lock map to prevent race conditions during concurrent webhook and redirect calls
const pendingLocks = new Set();

export async function fulfillFromSession(sessionId) {
  if (!sessionId) {
    throw new Error('Session ID is required for fulfillment');
  }

  // Check if fulfillment is already locked in-process
  if (pendingLocks.has(sessionId)) {
    // Wait for in-flight fulfillment to complete
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (!pendingLocks.has(sessionId)) break;
    }
  }

  // Check local order store
  const existingOrder = getOrder(sessionId);
  if (existingOrder && existingOrder.prodigiOrderId) {
    return {
      ok: true,
      reused: true,
      order: existingOrder,
    };
  }

  pendingLocks.add(sessionId);

  try {
    // Fetch latest status directly from Stripe
    const session = await retrieveSession(sessionId);

    // CRITICAL: Strict payment gate. Never send shirts to Prodigi unless payment succeeded!
    if (session.payment_status !== 'paid') {
      console.warn(`[fulfillment refused] Session ${sessionId} payment_status is '${session.payment_status}' (not paid)`);
      return {
        ok: false,
        reason: `Payment is not completed (status: ${session.payment_status})`,
        paymentStatus: session.payment_status,
      };
    }

    // Verify session metadata contains designToken
    const meta = session.metadata || {};
    const designToken = meta.designToken;
    const design = decodeDesign(designToken);

    if (!design) {
      throw new Error(`Session ${sessionId} has no valid design metadata`);
    }

    // Check if Prodigi already processed this merchant reference
    const existingProdigiId = await findOrderId(sessionId);
    if (existingProdigiId) {
      const orderRecord = saveOrder({
        sessionId,
        prodigiOrderId: existingProdigiId,
        design,
        designToken,
        status: 'fulfilled',
        amountTotal: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_details?.email,
        customerName: session.customer_details?.name,
        paymentStatus: session.payment_status,
        createdAt: new Date(session.created * 1000).toISOString(),
      });
      return {
        ok: true,
        reused: true,
        order: orderRecord,
      };
    }

    // Extract shipping address (supporting both legacy shipping_details and collected_information)
    const shipping =
      session.collected_information?.shipping_details ||
      session.shipping_details ||
      {};
    const address = shipping.address || {};

    if (!address.line1 || !address.city || !address.postal_code || !address.country) {
      throw new Error(`Session ${sessionId} is missing complete shipping address`);
    }

    const recipientName =
      shipping.name || session.customer_details?.name || 'Valued Customer';
    const recipientEmail = session.customer_details?.email || undefined;
    const recipientPhone =
      session.customer_details?.phone || shipping.phone || undefined;

    // Public print URL for Prodigi asset ingestion
    const printUrl = `${CONFIG.publicUrl}/api/print/${encodeURIComponent(designToken)}.png`;

    const garmentColor =
      CATALOG.colors[design.garment]?.prodigiColor || 'black';
    const garmentSize = design.size.toLowerCase();

    console.log(`[fulfilling order] Session ${sessionId} -> Prodigi (${CONFIG.sku}, ${garmentColor}, ${garmentSize})`);

    const prodigiResult = await createOrder({
      merchantReference: sessionId,
      idempotencyKey: sessionId,
      sku: CONFIG.sku,
      color: garmentColor,
      size: garmentSize,
      copies: 1,
      printUrl,
      recipient: {
        name: recipientName,
        email: recipientEmail,
        phoneNumber: recipientPhone,
        address: {
          line1: address.line1,
          line2: address.line2 || undefined,
          postalOrZipCode: address.postal_code,
          countryCode: address.country,
          townOrCity: address.city,
          stateOrCounty: address.state || undefined,
        },
      },
    });

    console.log(`[prodigi success] Order created: ${prodigiResult.id} for session ${sessionId}`);

    const orderRecord = saveOrder({
      sessionId,
      prodigiOrderId: prodigiResult.id,
      prodigiStatus: prodigiResult.status,
      design,
      designToken,
      printUrl,
      status: 'fulfilled',
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: recipientEmail,
      customerName: recipientName,
      shippingAddress: address,
      paymentStatus: session.payment_status,
      createdAt: new Date().toISOString(),
    });

    return {
      ok: true,
      order: orderRecord,
    };
  } finally {
    pendingLocks.delete(sessionId);
  }
}
