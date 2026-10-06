export type ShirtColor =
  | 'white'
  | 'black'
  | 'navy blue'
  | 'heather grey'
  | 'sport grey'
  | 'charcoal'
  | 'red';

export type ShirtSize = 's' | 'm' | 'l' | 'xl' | '2xl';

export interface DesignConfig {
  label: string;         // e.g. "WHERE WE MET"
  city: string;          // e.g. "Paris, France"
  latitude: number;      // 48.8566
  longitude: number;     // 2.3522
  year?: string;         // e.g. "2018"
  personalName?: string; // e.g. "—K & J"
  variant: 'classic' | 'minimal' | 'nautical';
}

export interface ProductVariant {
  sku: string;
  color: ShirtColor;
  size: ShirtSize;
  /** In USD, in cents (Stripe convention) */
  priceCents: number;
  /** Prodigi cost in USD (we add margin) */
  costCents: number;
}

export interface OrderRecord {
  id: string;             // internal id (uuid)
  createdAt: number;      // ms epoch
  design: DesignConfig;
  variant: { sku: string; color: ShirtColor; size: ShirtSize };
  shipping: ShippingDetails;
  amountCents: number;
  currency: string;
  status: OrderStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  prodigiOrderId?: string;
  assetUrl?: string;
  idempotencyKey: string;
}

export interface ShippingDetails {
  name: string;
  email?: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  countryCode: string;
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid_production'
  | 'prodigi_submitted'
  | 'prodigi_failed'
  | 'fulfilled';
