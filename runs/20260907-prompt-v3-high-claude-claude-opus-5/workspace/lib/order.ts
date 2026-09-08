/** Shared helpers for turning a design + garment choice into the things
 *  Stripe and Prodigi each need. Kept in one place so the checkout route and
 *  the webhook can never disagree about what was sold. */

import { CryptidSpec, encodeSpec } from "./spec";
import { generateCryptid } from "./genome";
import {
  GarmentChoice,
  colorById,
  sizeById,
  priceCents,
  PRODIGI_SKU,
  Ink,
} from "./catalog";

export type OrderDraft = {
  spec: CryptidSpec;
  garment: GarmentChoice;
  token: string;
  ink: Ink;
  commonName: string;
  binomial: string;
  amountCents: number;
  colorLabel: string;
  sizeLabel: string;
};

export function buildDraft(spec: CryptidSpec, garment: GarmentChoice): OrderDraft {
  const color = colorById(garment.color)!;
  const size = sizeById(garment.size)!;
  const cryptid = generateCryptid(spec);
  return {
    spec,
    garment,
    token: encodeSpec(spec),
    ink: color.ink,
    commonName: cryptid.commonName,
    binomial: cryptid.binomial,
    amountCents: priceCents(size.id),
    colorLabel: color.label,
    sizeLabel: size.label,
  };
}

/** The exact file Prodigi will download. Deterministic and cacheable. */
export function printFileUrl(origin: string, ink: Ink, token: string): string {
  return `${origin}/api/art/${ink}/${encodeURIComponent(token)}.png`;
}

export function previewUrl(
  origin: string,
  ink: Ink,
  token: string,
  width: number,
  bgHex: string
): string {
  return `${printFileUrl(origin, ink, token)}?w=${width}&bg=${bgHex.replace("#", "")}`;
}

export { PRODIGI_SKU };
