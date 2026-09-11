import { Spec } from "./spec";
import { pack, unpack } from "./sign";

export type Side = "front" | "back";
export type ArtPayload = { s: Spec; side: Side };

/** A signed, self-describing artwork reference. No database row required. */
export function artToken(spec: Spec, side: Side): string {
  return pack({ s: spec, side } satisfies ArtPayload);
}

export function readArtToken(token: string): ArtPayload | null {
  const p = unpack<ArtPayload>(token);
  if (!p || !p.s) return null;
  return { s: p.s, side: p.side === "back" ? "back" : "front" };
}

export function artUrl(origin: string, spec: Spec, side: Side): string {
  return `${origin}/api/art/${artToken(spec, side)}.png`;
}
