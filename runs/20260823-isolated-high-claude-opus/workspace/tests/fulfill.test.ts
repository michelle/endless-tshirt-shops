import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

const placeOrder = vi.fn();
const findOrderIdByToken = vi.fn();
const retrieve = vi.fn();
const update = vi.fn();

vi.mock('@/lib/scalablepress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/scalablepress')>();
  return { ...actual, placeOrder, findOrderIdByToken };
});

vi.mock('@/lib/stripe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/stripe')>();
  return {
    ...actual,
    stripe: () => ({ paymentIntents: { retrieve, update } }),
  };
});

const { fulfill } = await import('@/lib/fulfill');
const { ScalablePressError } = await import('@/lib/scalablepress');

function intent(overrides: Partial<Stripe.PaymentIntent> = {}): Stripe.PaymentIntent {
  return {
    id: 'pi_test_1',
    status: 'succeeded',
    metadata: {
      sp_design_id: 'design_1',
      sp_order_token: 'order_abc',
      sp_status: 'pending',
      style: 'fitted',
      size: 'M',
      shirt_timestamp: '1787455804123',
    },
    ...overrides,
  } as Stripe.PaymentIntent;
}

beforeEach(() => {
  vi.clearAllMocks();
  update.mockResolvedValue({});
  findOrderIdByToken.mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fulfill', () => {
  it('places the order and records the id on the PaymentIntent', async () => {
    placeOrder.mockResolvedValue({ placed: true, order: { orderId: 'sp_1', status: 'order' } });

    await expect(fulfill(intent())).resolves.toEqual({ status: 'placed', orderId: 'sp_1' });

    expect(placeOrder).toHaveBeenCalledWith('order_abc');
    expect(update).toHaveBeenCalledWith('pi_test_1', {
      metadata: { sp_order_id: 'sp_1', sp_status: 'placed' },
    });
  });

  it('is a no-op once an order id is already recorded', async () => {
    const pi = intent({ metadata: { ...intent().metadata, sp_order_id: 'sp_1' } });

    await expect(fulfill(pi)).resolves.toEqual({ status: 'placed', orderId: 'sp_1' });

    expect(placeOrder).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('does not send an unpaid order to the printer', async () => {
    await expect(fulfill(intent({ status: 'requires_payment_method' }))).resolves.toEqual({
      status: 'awaiting_payment',
    });
    expect(placeOrder).not.toHaveBeenCalled();
  });

  it('recovers the order id from the printer when the token was already placed', async () => {
    placeOrder.mockResolvedValue({ placed: false, alreadyPlaced: true });
    findOrderIdByToken.mockResolvedValue('sp_9');

    await expect(fulfill(intent())).resolves.toEqual({ status: 'placed', orderId: 'sp_9' });

    expect(findOrderIdByToken).toHaveBeenCalledWith('order_abc');
    // Recorded so later calls short-circuit instead of listing orders again.
    expect(update).toHaveBeenCalledWith('pi_test_1', {
      metadata: { sp_order_id: 'sp_9', sp_status: 'placed' },
    });
    // We never had to ask Stripe, so an ID lost by a failed write is still found.
    expect(retrieve).not.toHaveBeenCalled();
  });

  it('still reports placed when recording the recovered id fails', async () => {
    placeOrder.mockResolvedValue({ placed: false, alreadyPlaced: true });
    findOrderIdByToken.mockResolvedValue('sp_9');
    update.mockRejectedValue(new Error('stripe down'));

    await expect(fulfill(intent())).resolves.toEqual({ status: 'placed', orderId: 'sp_9' });
  });

  it('falls back to the PaymentIntent when the printer cannot resolve the token', async () => {
    placeOrder.mockResolvedValue({ placed: false, alreadyPlaced: true });
    findOrderIdByToken.mockResolvedValue(null);
    retrieve.mockResolvedValue(intent({ metadata: { ...intent().metadata, sp_order_id: 'sp_9' } }));

    await expect(fulfill(intent())).resolves.toEqual({ status: 'placed', orderId: 'sp_9' });
    // No second write: no duplicate shirt and no clobbered metadata.
    expect(update).not.toHaveBeenCalled();
  });

  it('falls back to the PaymentIntent when the printer lookup errors', async () => {
    placeOrder.mockResolvedValue({ placed: false, alreadyPlaced: true });
    findOrderIdByToken.mockRejectedValue(new ScalablePressError('order.list', 500, 'boom'));
    retrieve.mockResolvedValue(intent({ metadata: { ...intent().metadata, sp_order_id: 'sp_9' } }));

    await expect(fulfill(intent())).resolves.toEqual({ status: 'placed', orderId: 'sp_9' });
  });

  it('reports "placing" when neither the printer nor Stripe knows the id yet', async () => {
    placeOrder.mockResolvedValue({ placed: false, alreadyPlaced: true });
    findOrderIdByToken.mockResolvedValue(null);
    retrieve.mockResolvedValue(intent());

    await expect(fulfill(intent())).resolves.toEqual({ status: 'placing' });
  });

  it('keeps a transient print-partner outage retryable', async () => {
    placeOrder.mockRejectedValue(new ScalablePressError('order', 500, 'Internal Server Error'));

    await expect(fulfill(intent())).resolves.toEqual({ status: 'placing' });
    // Must not be marked failed: the money is captured and we want to try again.
    expect(update).not.toHaveBeenCalled();
  });

  it('marks a permanent rejection as failed so a human can see it in Stripe', async () => {
    placeOrder.mockRejectedValue(
      new ScalablePressError('order', 400, 'bad', [{ message: 'Insufficient quantity' }]),
    );

    const state = await fulfill(intent());

    expect(state).toEqual({ status: 'failed', message: 'Insufficient quantity' });
    expect(update).toHaveBeenCalledWith('pi_test_1', {
      metadata: { sp_status: 'failed', sp_error: 'Insufficient quantity' },
    });
  });

  it('does not retry an order already marked failed', async () => {
    const pi = intent({
      metadata: { ...intent().metadata, sp_status: 'failed', sp_error: 'Out of stock' },
    });

    await expect(fulfill(pi)).resolves.toEqual({ status: 'failed', message: 'Out of stock' });
    expect(placeOrder).not.toHaveBeenCalled();
  });

  it('fails loudly when the order token is missing', async () => {
    const pi = intent({ metadata: { style: 'fitted', size: 'M' } });

    const state = await fulfill(pi);

    expect(state.status).toBe('failed');
    expect(placeOrder).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith('pi_test_1', {
      metadata: { sp_status: 'failed', sp_error: 'Internal error: order token missing.' },
    });
  });

  it('treats a placed order with no id as still settling rather than done', async () => {
    placeOrder.mockResolvedValue({ placed: true, order: { status: 'order' } });

    await expect(fulfill(intent())).resolves.toEqual({ status: 'placing' });
    expect(update).not.toHaveBeenCalled();
  });
});
