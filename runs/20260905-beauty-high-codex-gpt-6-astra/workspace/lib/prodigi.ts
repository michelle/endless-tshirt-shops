import { SKUS, type Purchase } from "./catalog";
export type ProdigiOrder = {
  id: string;
  status: { stage: string; issues?: { description?: string; code?: string }[] };
  shipments?: { tracking?: { url?: string; number?: string } }[];
  items?: { assets?: { status: string }[] }[];
};
export function prodigiBase() {
  return process.env.PRODIGI_ENV === "live"
    ? "https://api.prodigi.com/v4.0"
    : "https://api.sandbox.prodigi.com/v4.0";
}
export async function prodigi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!process.env.PRODIGI_API_KEY)
    throw new Error("Prodigi is not configured");
  const response = await fetch(`${prodigiBase()}${path}`, {
    ...options,
    headers: {
      "X-API-Key": process.env.PRODIGI_API_KEY,
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });
  const data = await response.json();
  if (
    !response.ok ||
    !["ok", "created", "alreadyexists", "onhold", "createdwithissues"].includes(
      String(data.outcome).toLowerCase(),
    )
  ) {
    console.error("Prodigi request failed", {
      status: response.status,
      outcome: data.outcome,
      code: data.code,
    });
    throw new Error("The print service could not accept this request.");
  }
  return data as T;
}
export async function checkVariant(
  p: Pick<Purchase, "fit" | "color" | "size">,
) {
  const data = await prodigi<{
    product: {
      variants: {
        attributes: { color: string; size: string };
        shipsTo: string[];
      }[];
    };
  }>(`/products/${SKUS[p.fit]}`);
  if (
    !data.product.variants.some(
      (v) =>
        v.attributes.color === p.color &&
        v.attributes.size === p.size.toLowerCase() &&
        v.shipsTo.includes("US"),
    )
  )
    throw new Error(
      "This combination is currently unavailable. Please choose another color or size.",
    );
}
