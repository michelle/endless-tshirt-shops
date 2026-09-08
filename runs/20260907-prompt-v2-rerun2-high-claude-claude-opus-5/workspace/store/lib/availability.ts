import data from "@/data/availability.json";
import { GARMENTS, SIZE_LABEL } from "./catalog";
import type { PricedLine } from "./cart";

const shipsTo = (data as { shipsTo: Record<string, string[]> }).shipsTo;

export const variantShipsTo = (color: string, size: string, country: string) =>
  shipsTo[`${color}|${size}`]?.includes(country) ?? false;

/** Colours we sell that can reach this country in this size. */
export const coloursFor = (size: string, country: string) =>
  GARMENTS.filter((g) => variantShipsTo(g.id, size, country));

export type Unavailable = { line: PricedLine; alternatives: string[] };

export function unavailableLines(lines: PricedLine[], country: string): Unavailable[] {
  return lines
    .filter((l) => !variantShipsTo(l.color, l.size, country))
    .map((l) => ({ line: l, alternatives: coloursFor(l.size, country).map((g) => g.label) }));
}

export function unavailableMessage(u: Unavailable, countryName: string): string {
  const { line, alternatives } = u;
  const size = SIZE_LABEL[line.size] ?? line.size;
  const alt = alternatives.length
    ? ` Available to ${countryName} in ${size}: ${alternatives.join(", ")}.`
    : ` No colour in ${size} ships to ${countryName} right now.`;
  return `${line.name} in ${line.colorLabel}, ${size} can't be shipped to ${countryName}.${alt}`;
}
