import { COLORWAYS, FITS, PRICE, SHIPPING, type ColorwayId, type FitId, type ShippingId } from "./catalog";
import { isDialect, safeTimeZone, summarize, type DialectId } from "./dialects";
import { sign } from "./signing";

/**
 * Everything needed to make one shirt. It round-trips through Stripe payment
 * intent metadata, so there is no database anywhere in this store — the moment
 * you bought lives inside your payment.
 */
export type OrderSpec = {
  epochMs: number;
  dialect: DialectId;
  fit: FitId;
  size: string;
  colorway: ColorwayId;
  shipping: ShippingId;
  timeZone: string;
};

export class SpecError extends Error {}

/** Reject anything we could not actually print, loudly and early. */
export function parseSpec(input: unknown): OrderSpec {
  const raw = (input ?? {}) as Record<string, unknown>;

  const epochMs = Number(raw.epochMs);
  if (!Number.isFinite(epochMs) || epochMs < 0 || epochMs > 4102444800000) {
    throw new SpecError("That moment is not on any calendar we print for.");
  }

  if (!isDialect(raw.dialect)) throw new SpecError("Unknown way of telling the time.");

  const fit = raw.fit as FitId;
  if (!(typeof fit === "string" && fit in FITS)) throw new SpecError("Unknown fit.");

  const size = String(raw.size ?? "");
  if (!FITS[fit].sizes.includes(size)) throw new SpecError("That size does not exist in that fit.");

  const colorway = raw.colorway as ColorwayId;
  if (!(typeof colorway === "string" && colorway in COLORWAYS)) throw new SpecError("Unknown colour.");

  const shipping = (raw.shipping ?? "standard") as ShippingId;
  if (!(typeof shipping === "string" && shipping in SHIPPING)) throw new SpecError("Unknown shipping speed.");

  return {
    epochMs: Math.trunc(epochMs),
    dialect: raw.dialect,
    fit,
    size,
    colorway,
    shipping,
    timeZone: safeTimeZone(typeof raw.timeZone === "string" ? raw.timeZone : "UTC"),
  };
}

export function totalCents(spec: OrderSpec) {
  return PRICE.amount + SHIPPING[spec.shipping].amount;
}

/** Stripe metadata is a flat string map; keep the keys short and stable. */
export function toMetadata(spec: OrderSpec): Record<string, string> {
  return {
    ds_epochMs: String(spec.epochMs),
    ds_dialect: spec.dialect,
    ds_fit: spec.fit,
    ds_size: spec.size,
    ds_colorway: spec.colorway,
    ds_shipping: spec.shipping,
    ds_timeZone: spec.timeZone,
  };
}

export function fromMetadata(md: Record<string, string> | null | undefined): OrderSpec | null {
  if (!md?.ds_epochMs) return null;
  try {
    return parseSpec({
      epochMs: Number(md.ds_epochMs),
      dialect: md.ds_dialect,
      fit: md.ds_fit,
      size: md.ds_size,
      colorway: md.ds_colorway,
      shipping: md.ds_shipping,
      timeZone: md.ds_timeZone,
    });
  } catch {
    return null;
  }
}

/** The query string that fully describes a print file. Also the cache key. */
export function artworkQuery(spec: OrderSpec, width?: number) {
  const payload = `${spec.epochMs}|${spec.dialect}|${spec.colorway}|${spec.timeZone}`;
  const q = new URLSearchParams({
    t: String(spec.epochMs),
    d: spec.dialect,
    c: spec.colorway,
    tz: spec.timeZone,
    sig: sign(payload),
  });
  if (width) q.set("w", String(width));
  return q.toString();
}

export function artworkPath(spec: OrderSpec, width?: number) {
  return `/api/artwork?${artworkQuery(spec, width)}`;
}

/** A friendly, human-quotable reference. */
export function orderRef(paymentIntentId: string) {
  return "DT-" + paymentIntentId.replace(/^pi_/, "").slice(-8).toUpperCase();
}

export function describe(spec: OrderSpec) {
  const fit = FITS[spec.fit];
  const colorway = COLORWAYS[spec.colorway];
  return {
    title: `${colorway.name} ${fit.name} tee`,
    line: summarize(spec.dialect, spec.epochMs, spec.timeZone),
    size: fit.sizeLabels[spec.size] ?? spec.size.toUpperCase(),
    sku: fit.sku,
    prodigiColor: colorway.prodigiColor,
    ink: colorway.ink,
  };
}
