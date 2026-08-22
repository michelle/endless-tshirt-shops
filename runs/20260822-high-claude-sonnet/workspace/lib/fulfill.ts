import { renderArtworkPng } from "./artwork";
import { createDesign, createOrder, createQuote, type ShipAddress } from "./scalablePress";
import { SP_COLOR, SP_PRODUCTS, SP_SIZES, type ShirtSize, type ShirtStyle } from "./products";

export async function fulfillOrder(
  style: ShirtStyle,
  size: ShirtSize,
  timestampMs: number,
  address: ShipAddress
): Promise<string> {
  const artwork = await renderArtworkPng(timestampMs);
  const designId = await createDesign(artwork);
  const quote = await createQuote(
    SP_PRODUCTS[style],
    SP_COLOR,
    SP_SIZES[size],
    designId,
    address
  );
  return createOrder(quote.orderToken);
}
