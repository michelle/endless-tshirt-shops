import { NextResponse } from 'next/server';
import { ConfigError } from './env';
import { ScalablePressError, type OrderIssue } from './scalablepress';
import { ValidationError } from './order-request';
import { FulfillmentError } from './fulfillment';

export interface ApiErrorBody {
  error: { message: string; code?: string };
  issues?: OrderIssue[];
}

/**
 * Convert a thrown error into a response that is safe for the browser:
 * customer-facing message only, full detail to the server log.
 */
export function errorResponse(context: string, error: unknown): NextResponse<ApiErrorBody> {
  console.error(`[${context}]`, error);

  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: { message: error.message, code: 'invalid_request' } },
      { status: 400 },
    );
  }

  if (error instanceof ScalablePressError) {
    return NextResponse.json(
      { error: { message: error.clientMessage, code: 'print_partner_error' }, issues: error.issues },
      { status: error.statusCode >= 500 ? 502 : error.statusCode },
    );
  }

  if (error instanceof FulfillmentError) {
    return NextResponse.json(
      { error: { message: error.clientMessage, code: 'fulfillment_error' } },
      { status: error.statusCode },
    );
  }

  if (error instanceof ConfigError) {
    return NextResponse.json(
      { error: { message: 'The store is not fully configured.', code: 'configuration_error' } },
      { status: 500 },
    );
  }

  // Stripe SDK errors expose a safe `message` for card problems.
  if (typeof error === 'object' && error !== null && 'type' in error) {
    const stripeError = error as { type?: string; message?: string; code?: string };
    if (typeof stripeError.type === 'string' && stripeError.type.startsWith('Stripe')) {
      const isCardError = stripeError.type === 'StripeCardError';
      return NextResponse.json(
        {
          error: {
            message: isCardError
              ? (stripeError.message ?? 'Your card was declined.')
              : 'Payment processing failed. Please try again.',
            code: stripeError.code ?? 'stripe_error',
          },
        },
        { status: isCardError ? 402 : 502 },
      );
    }
  }

  return NextResponse.json(
    { error: { message: 'Something went wrong. Please try again.', code: 'internal_error' } },
    { status: 500 },
  );
}
