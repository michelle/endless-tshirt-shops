/**
 * Customization parameters: everything the customer chose that feeds both the
 * print (date, hemisphere, garment, dedication) and the physical product
 * (size, quantity). Shared by the browser, the checkout API and the
 * fulfillment webhook, so validation lives in one place.
 */

import { GARMENTS, SIZES, type Size } from "./products";
import { moonPhaseAt } from "./moon";

export type Hemisphere = "N" | "S";
export type GarmentId = (typeof GARMENTS)[number]["id"];

/** Everything needed to draw the print. */
export interface DesignSpec {
  /** UTC calendar date, "YYYY-MM-DD". */
  date: string;
  /** Optional UTC clock time, "HH:MM". */
  time?: string;
  /** Hemisphere the shirt will be worn in — flips which side is lit. */
  hemisphere: Hemisphere;
  /** Garment color; selects the ink palette. */
  garment: GarmentId;
  /** A personal line under the date, e.g. "for Mira" or "Berlin". */
  line?: string;
}

/** A full order: design + physical product. */
export interface OrderSpec extends DesignSpec {
  size: Size;
  quantity: number;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const LINE_OK_RE = /^[\p{L}\p{N} ,.'’&/·:!?-]*$/u;

/**
 * Parse and validate a spec coming from an untrusted client. Returns the
 * normalized spec or a list of human-readable issues.
 */
export function validateSpec(input: unknown): { spec?: OrderSpec; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const raw = (input ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : undefined);

  const date = str(raw.date);
  if (!date || !DATE_RE.test(date)) {
    issues.push({ field: "date", message: "Pick a date (YYYY-MM-DD)." });
  } else {
    const y = Number(date.slice(0, 4));
    const m = Number(date.slice(5, 7));
    const d = Number(date.slice(8, 10));
    const md = new Date(Date.UTC(y, m - 1, d));
    if (
      y < 1900 || y > 2100 ||
      md.getUTCFullYear() !== y || md.getUTCMonth() !== m - 1 || md.getUTCDate() !== d
    ) {
      issues.push({ field: "date", message: "Date must be a real calendar date between 1900 and 2100." });
    }
  }

  const time = str(raw.time);
  if (time && !TIME_RE.test(time)) {
    issues.push({ field: "time", message: "Time must look like HH:MM (24h)." });
  }

  const hemisphere = str(raw.hemisphere);
  if (hemisphere !== "N" && hemisphere !== "S") {
    issues.push({ field: "hemisphere", message: "Hemisphere must be N or S." });
  }

  const garment = str(raw.garment);
  if (!GARMENTS.some((g) => g.id === garment)) {
    issues.push({ field: "garment", message: "Choose a garment color." });
  }

  const size = str(raw.size)?.toLowerCase();
  if (!(SIZES as readonly string[]).includes(size ?? "")) {
    issues.push({ field: "size", message: "Choose a size (S through 3XL)." });
  }

  const quantity = Number(raw.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5) {
    issues.push({ field: "quantity", message: "Quantity must be between 1 and 5." });
  }

  const line = str(raw.line);
  if (line) {
    if (line.length > 28) {
      issues.push({ field: "line", message: "Keep the personal line at 28 characters or fewer." });
    } else if (!LINE_OK_RE.test(line)) {
      issues.push({
        field: "line",
        message: "The personal line allows letters, numbers and simple punctuation only.",
      });
    }
  }

  if (issues.length > 0) return { issues };

  const spec: OrderSpec = {
    date: date!,
    time: time || undefined,
    hemisphere: hemisphere as Hemisphere,
    garment: garment as GarmentId,
    size: size as Size,
    quantity,
    line: line || undefined,
  };
  return { spec, issues: [] };
}

/** UTC timestamp for the moment the customer picked. Midday when no time given. */
export function specTimestamp(spec: DesignSpec): number {
  const [y, m, d] = spec.date.split("-").map(Number);
  let hh = 12, mm = 0;
  if (spec.time) {
    const [h, min] = spec.time.split(":").map(Number);
    hh = h; mm = min;
  }
  return Date.UTC(y, m - 1, d, hh, mm);
}

/** Phase info for a design spec (used for previews, labels, receipts). */
export function specPhase(spec: DesignSpec) {
  return moonPhaseAt(specTimestamp(spec));
}

/** Short phase label used in Stripe line items, e.g. "Waxing Gibbous 84%". */
export function specPhaseShort(spec: DesignSpec): string {
  const p = specPhase(spec);
  const pct = Math.round(p.illumination * 100);
  return `${p.phaseName} ${pct}%`;
}
