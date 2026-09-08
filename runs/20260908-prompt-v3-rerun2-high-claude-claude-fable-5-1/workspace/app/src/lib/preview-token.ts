// Unsigned, compact encoding of a design for the low-resolution public
// preview image (used as the product image in Stripe Checkout). Rendering
// a small preview is cheap, so no signature is required here; the full-size
// print asset uses signed tokens (see token.ts).
import { Design, parseDesign } from "./design";

export function previewToken(design: Design): string {
  return Buffer.from(JSON.stringify(design), "utf8").toString("base64url");
}

export function parsePreviewToken(token: string): Design | null {
  try {
    return parseDesign(JSON.parse(Buffer.from(token, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}
