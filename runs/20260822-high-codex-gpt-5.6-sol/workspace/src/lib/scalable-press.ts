import { PRODUCT_IDS, SIZES } from "./config";
import type { OrderOptions } from "./validation";
import { createTimestampArtwork } from "./artwork";

const API_BASE = "https://api.scalablepress.com/v2";

type ShippingAddress = {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

type ApiErrorBody = { message?: string; issues?: Array<{ message?: string }>; orderIssues?: Array<{ message?: string }>; statusCode?: number };

function authHeader() {
  const key = process.env.SP_AUTH;
  if (!key) throw new Error("Scalable Press is not configured.");
  return `Basic ${Buffer.from(`:${key}`).toString("base64")}`;
}

async function apiFetch(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (response.status < 500 || attempt === attempts) return response;
      await response.arrayBuffer();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 250));
  }
  throw lastError || new Error("Scalable Press request failed.");
}

async function readResponse<T>(response: Response, action: string): Promise<T> {
  const body = await response.json().catch(() => ({})) as T & ApiErrorBody;
  const issues = body.orderIssues || body.issues;
  if (!response.ok || (body.statusCode && body.statusCode >= 300) || issues?.length) {
    const detail = issues?.map((issue) => issue.message).filter(Boolean).join("; ") || body.message || `HTTP ${response.status}`;
    throw new Error(`Scalable Press ${action} failed: ${detail}`);
  }
  return body;
}

export async function createScalablePressOrder(options: OrderOptions, address: ShippingAddress) {
  const artwork = await createTimestampArtwork(String(options.timestamp));
  const designForm = new FormData();
  designForm.set("type", "dtg");
  designForm.set("sides[front][artwork]", new Blob([artwork], { type: "image/png" }), `datetime-${options.timestamp}.png`);
  designForm.set("sides[front][dimensions][width]", "8");
  designForm.set("sides[front][position][horizontal]", "C");
  designForm.set("sides[front][position][offset][top]", "3");

  const designResponse = await apiFetch(`${API_BASE}/design`, { method: "POST", headers: { Authorization: authHeader() }, body: designForm });
  const design = await readResponse<{ designId: string }>(designResponse, "design");
  if (!design.designId) throw new Error("Scalable Press returned no design ID.");

  const quoteResponse = await apiFetch(`${API_BASE}/quote`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "dtg",
      products: [{ id: PRODUCT_IDS[options.style], color: "Black", quantity: 1, size: SIZES[options.size] }],
      designId: design.designId,
      address,
    }),
  });
  const quote = await readResponse<{ orderToken: string; total?: number }>(quoteResponse, "quote");
  if (!quote.orderToken) throw new Error("Scalable Press returned no order token.");

  if (process.env.SCALABLE_PRESS_ORDERING !== "enabled") {
    return { status: "quote_only" as const, id: quote.orderToken, designId: design.designId };
  }

  const orderResponse = await apiFetch(`${API_BASE}/order`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ orderToken: quote.orderToken }),
  });
  const order = await readResponse<{ orderId: string }>(orderResponse, "order");
  if (!order.orderId) throw new Error("Scalable Press returned no order ID.");
  return { status: "ordered" as const, id: order.orderId, designId: design.designId };
}
