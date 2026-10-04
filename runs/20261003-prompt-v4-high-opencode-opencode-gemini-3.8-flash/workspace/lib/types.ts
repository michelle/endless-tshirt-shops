export type GarmentColor = 'black' | 'navy blue' | 'white' | 'natural';
export type DesignStyle = 'gold' | 'silver' | 'minimal' | 'copper';
export type ShirtSize = 'xs' | 's' | 'm' | 'l' | 'xl' | '2xl';

export interface DesignParams {
  title: string;
  subtitle?: string;
  dedication?: string;
  city: string;
  lat: number;
  lng: number;
  date: string; // ISO date string, e.g. "2024-10-04T21:30:00Z"
  color: GarmentColor;
  style: DesignStyle;
  size: ShirtSize;
  showConstellations: boolean;
  showCoordinates: boolean;
  showMoon: boolean;
  showGrid: boolean;
}

export interface Star {
  id: string;
  name?: string;
  ra: number; // in hours (0 to 24)
  dec: number; // in degrees (-90 to +90)
  mag: number; // visual magnitude (-1.46 to 6.0)
}

export interface Constellation {
  id: string;
  name: string;
  lines: [string, string][]; // pairs of star IDs
}

export interface MoonPhaseInfo {
  ageDays: string;
  phaseName: string;
  illumination: number; // 0 to 100
  phaseFrac: number; // 0 to 1
}

export interface ShippingAddress {
  name: string;
  email: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderRecord {
  id: string;
  createdAt: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  prodigiOrderId?: string;
  status: 'pending_payment' | 'paid' | 'prodigi_submitted' | 'failed';
  designParams: DesignParams;
  shippingAddress?: ShippingAddress;
  amount: number;
  currency: string;
  prodigiStatus?: any;
}
