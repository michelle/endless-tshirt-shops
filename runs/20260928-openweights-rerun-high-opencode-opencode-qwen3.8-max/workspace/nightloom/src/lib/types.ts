export interface DesignParams {
  /** Headline name printed under the sky (1..24 chars). */
  name: string;
  /** Short caption line (0..48 chars), e.g. "the night you were born". */
  caption: string;
  /** Event date, YYYY-MM-DD. */
  date: string;
  /** Wall-clock time HH:MM (local mean solar time at the location). */
  time: string;
  /** Latitude, degrees north-positive. */
  lat: number;
  /** Longitude, degrees east-positive. */
  lng: number;
  /** Display label for the location, e.g. "New York, US". */
  placeLabel: string;
  /** Palette id. */
  palette: 'midnight' | 'twilight' | 'aurora' | 'ivory';
  /** Draw constellation lines. */
  showLines: boolean;
  /** Draw constellation + star name labels. */
  showLabels: boolean;
}

export interface ProductChoice {
  /** Prodigi variant color attribute, e.g. "black". */
  color: string;
  /** Prodigi variant size attribute, e.g. "l". */
  size: string;
  /** Copies of this exact garment+design (1..4). */
  qty: number;
}

export interface ShippingInfo {
  fullName: string;
  email: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
}

/** Everything needed to fulfill one paid order. */
export interface OrderPayload {
  /** Merchant order reference, e.g. NL-4F2A9C. */
  orderRef: string;
  design: DesignParams;
  product: ProductChoice;
  shipping: ShippingInfo;
  /** Unique per checkout attempt; used as Prodigi idempotency key. */
  attemptId: string;
}

export const CAPTION_PRESETS = [
  'the night you were born',
  'the night we met',
  'our first dance',
  'welcome to the world',
  'under this sky, i said yes',
  'the night you arrived',
] as const;
