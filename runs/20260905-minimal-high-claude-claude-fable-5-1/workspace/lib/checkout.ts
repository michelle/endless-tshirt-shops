import { isValidTimestamp } from "./artwork";
import { ALLOWED_COUNTRIES, isShirtSize, isShirtStyle, type ShirtSize, type ShirtStyle } from "./products";

export interface ShippingInput {
  name: string;
  phone?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
  };
}

export interface CheckoutInput {
  style: ShirtStyle;
  size: ShirtSize;
  timestamp: number;
  email: string;
  shipping: ShippingInput;
}

export class ValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(value: unknown, field: string, { required = true, max = 200 } = {}): string {
  if (value == null || value === "") {
    if (required) throw new ValidationError(`${field} is required`, field);
    return "";
  }
  if (typeof value !== "string") throw new ValidationError(`${field} must be a string`, field);
  const trimmed = value.trim();
  if (required && !trimmed) throw new ValidationError(`${field} is required`, field);
  if (trimmed.length > max) throw new ValidationError(`${field} is too long`, field);
  return trimmed;
}

/** Validate and normalise the JSON body of POST /api/checkout. */
export function parseCheckoutInput(body: unknown): CheckoutInput {
  if (!body || typeof body !== "object") throw new ValidationError("Request body must be a JSON object");
  const b = body as Record<string, unknown>;

  if (!isShirtStyle(b.style)) throw new ValidationError("Choose a shirt style", "style");
  if (!isShirtSize(b.size)) throw new ValidationError("Choose a size", "size");
  if (!isValidTimestamp(b.timestamp)) throw new ValidationError("Invalid timestamp", "timestamp");

  const email = str(b.email, "email").toLowerCase();
  if (!EMAIL_RE.test(email)) throw new ValidationError("Enter a valid email address", "email");

  const s = (b.shipping ?? {}) as Record<string, unknown>;
  const a = (s.address ?? {}) as Record<string, unknown>;
  const country = str(a.country, "country", { max: 2 }).toUpperCase();
  if (!(ALLOWED_COUNTRIES as readonly string[]).includes(country)) {
    throw new ValidationError(`Sorry, we only ship to: ${ALLOWED_COUNTRIES.join(", ")}`, "country");
  }

  return {
    style: b.style,
    size: b.size,
    timestamp: b.timestamp,
    email,
    shipping: {
      name: str(s.name, "name"),
      phone: str(s.phone, "phone", { required: false, max: 40 }) || undefined,
      address: {
        line1: str(a.line1, "address line 1"),
        line2: str(a.line2, "address line 2", { required: false }) || undefined,
        city: str(a.city, "city"),
        state: str(a.state, "state", { required: false, max: 60 }) || undefined,
        postal_code: str(a.postal_code, "postal code", { max: 20 }),
        country,
      },
    },
  };
}
