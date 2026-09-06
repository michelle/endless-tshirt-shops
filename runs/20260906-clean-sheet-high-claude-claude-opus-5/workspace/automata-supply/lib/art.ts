import { designToParams, type Design } from "./design";

/** On-site preview PNG (transparent, sized for the browser). */
export function artUrl(design: Design, width = 900): string {
  return `/api/art?${designToParams(design)}&w=${width}`;
}

/** Lattice only, no print-area padding or caption. */
export function markUrl(design: Design, width = 120): string {
  return `/api/art?${designToParams(design)}&w=${width}&bare=1`;
}

/**
 * Preview flattened onto the garment colour. Stripe Checkout composites
 * line-item images onto white, where a bone-white design would vanish.
 */
export function thumbUrl(design: Design, garmentHex: string, width = 480): string {
  return `/api/art?${designToParams(design)}&w=${width}&bg=${garmentHex.replace("#", "")}`;
}

/** The exact asset Prodigi downloads and prints. Must be absolute and public. */
export function printUrl(design: Design, origin: string): string {
  return `${origin}/api/print?${designToParams(design)}`;
}

/**
 * The public origin of this deployment. Prodigi fetches print assets from it,
 * so it has to be the real hostname rather than a request-relative path.
 */
export function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
