import { isValidTimestamp } from "./artwork";
import { isSize, isStyle, SHIPPING_COUNTRIES, type Size, type Style } from "./products";

export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface CheckoutRequest {
  style: Style;
  size: Size;
  /** Unix ms; the design itself. */
  timestamp: number;
  email: string;
  shipping: {
    name: string;
    phone?: string;
    address: ShippingAddress;
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(value: unknown, field: string, { required = true, max = 200 } = {}): string {
  if (value === undefined || value === null || value === "") {
    if (required) throw new ValidationError(`${field} is required`);
    return "";
  }
  if (typeof value !== "string") throw new ValidationError(`${field} must be a string`);
  const trimmed = value.trim();
  if (required && !trimmed) throw new ValidationError(`${field} is required`);
  if (trimmed.length > max) throw new ValidationError(`${field} is too long`);
  return trimmed;
}

/** Validate and normalise the JSON body of POST /api/checkout. Throws ValidationError. */
export function parseCheckoutRequest(body: unknown, now: number = Date.now()): CheckoutRequest {
  if (!body || typeof body !== "object") throw new ValidationError("Invalid request body");
  const b = body as Record<string, unknown>;

  if (!isStyle(b.style)) throw new ValidationError("Pick a style");
  if (!isSize(b.size)) throw new ValidationError("Pick a size");
  if (!isValidTimestamp(b.timestamp, now)) throw new ValidationError("The shirt's datetime is missing or stale. Reload and try again.");

  const email = str(b.email, "Email").toLowerCase();
  if (!EMAIL_RE.test(email)) throw new ValidationError("Enter a valid email address");

  const shipping = (b.shipping ?? {}) as Record<string, unknown>;
  const name = str(shipping.name, "Name", { max: 100 });
  const phone = str(shipping.phone, "Phone", { required: false, max: 40 }) || undefined;
  const addr = (shipping.address ?? {}) as Record<string, unknown>;
  const country = str(addr.country, "Country", { max: 2 }).toUpperCase();
  if (!(SHIPPING_COUNTRIES as readonly string[]).includes(country)) {
    throw new ValidationError(`Sorry, we only ship to ${SHIPPING_COUNTRIES.join(", ")} right now`);
  }
  const address: ShippingAddress = {
    line1: str(addr.line1, "Street address"),
    line2: str(addr.line2, "Address line 2", { required: false }) || undefined,
    city: str(addr.city, "City", { max: 100 }),
    state: str(addr.state, "State", { max: 100 }),
    postal_code: str(addr.postal_code, "Postal code", { max: 20 }),
    country,
  };

  return { style: b.style, size: b.size, timestamp: b.timestamp, email, shipping: { name, phone, address } };
}
