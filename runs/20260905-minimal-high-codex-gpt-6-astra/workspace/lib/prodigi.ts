import { itemFor, type Selection } from "./catalog";
import { required, sandbox } from "./config";
export interface ProdigiOrder {
  id: string;
  status: {
    stage: string;
    issues: Array<{ code: string; description?: string }>;
    details: Record<string, string>;
  };
  shipments: Array<{
    tracking?: { number?: string; url?: string };
    carrier?: { name?: string };
  }>;
  items?: Array<{
    status: string;
    assets?: Array<{ status: string; url: string }>;
  }>;
}
export async function prodigi<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(
    `https://${sandbox() ? "api.sandbox.prodigi.com" : "api.prodigi.com"}/v4.0${path}`,
    {
      method: body ? "POST" : "GET",
      headers: {
        "X-API-Key": required("PRODIGI_API_KEY"),
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    },
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      `Prodigi ${response.status}: ${data.outcome ?? "request failed"}`,
    );
  return data as T;
}
const quoteCache = new Map<string, { until: number; value: unknown }>();
export async function checkAvailability(selection: Selection) {
  const key = selection.fit + selection.size;
  const cached = quoteCache.get(key);
  if (cached && cached.until > Date.now()) return cached.value;
  const { sku, copies, attributes } = itemFor(selection);
  const data = await prodigi<{
    outcome: string;
    issues?: Array<{ errorCode: string }>;
    quotes: Array<{
      shipmentMethod: string;
      items: Array<{ sku: string }>;
      costSummary?: unknown;
    }>;
  }>("/quotes", {
    shippingMethod: "Standard",
    destinationCountryCode: "US",
    currencyCode: "USD",
    items: [{ sku, copies, attributes, assets: [{ printArea: "front" }] }],
  });
  if (
    !data.quotes?.length ||
    data.issues?.some(
      (issue) => issue.errorCode !== "destinationCountryCode.UsSalesTaxWarning",
    )
  )
    throw new Error(
      "This shirt is temporarily unavailable from the print partner.",
    );
  quoteCache.set(key, { until: Date.now() + 300000, value: data });
  return data;
}

// Prodigi's actual AlreadyExists response contains only {order:{id}}.
// Hydrate it before saving status, including after a lost Stripe acknowledgment.
export async function resolveOrderResponse(
  response: { order?: Partial<ProdigiOrder> },
  load: (id: string) => Promise<ProdigiOrder> = async (id) =>
    (
      await prodigi<{ order: ProdigiOrder }>(
        `/orders/${encodeURIComponent(id)}`,
      )
    ).order,
): Promise<ProdigiOrder> {
  if (!response.order?.id)
    throw new Error("Print partner returned no order ID");
  const order = response.order.status
    ? (response.order as ProdigiOrder)
    : await load(response.order.id);
  if (!order.status || !order.id)
    throw new Error("Print partner returned incomplete order details");
  return order;
}
