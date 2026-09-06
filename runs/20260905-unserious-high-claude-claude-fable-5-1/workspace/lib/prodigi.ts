import "server-only";

/**
 * Minimal Prodigi Print API v4 client.
 * Docs: https://www.prodigi.com/print-api/docs/reference/
 */

export type ProdigiAddress = {
  line1: string;
  line2?: string;
  townOrCity: string;
  stateOrCounty?: string;
  postalOrZipCode: string;
  countryCode: string;
};

export type ProdigiOrderRequest = {
  merchantReference?: string;
  shippingMethod: "Budget" | "Standard" | "StandardPlus" | "Express" | "Overnight";
  idempotencyKey?: string;
  callbackUrl?: string;
  recipient: {
    name: string;
    email?: string;
    phoneNumber?: string;
    address: ProdigiAddress;
  };
  items: Array<{
    sku: string;
    copies: number;
    sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
    merchantReference?: string;
    attributes?: Record<string, string>;
    assets: Array<{ printArea: string; url: string }>;
  }>;
  metadata?: Record<string, string>;
};

export type ProdigiOrder = {
  id: string;
  created: string;
  lastUpdated?: string;
  merchantReference?: string;
  status: {
    stage: "Draft" | "AwaitingPayment" | "InProgress" | "Complete" | "Cancelled" | "OnHold" | string;
    issues?: Array<{ objectId?: string; errorCode?: string; description?: string }>;
    details?: Record<string, string>;
  };
  shipments?: Array<{
    id: string;
    status?: string;
    carrier?: { name?: string; service?: string };
    tracking?: { number?: string; url?: string } | null;
    dispatchDate?: string | null;
  }>;
  recipient?: { name?: string; address?: ProdigiAddress };
  items?: Array<{ id: string; sku: string; status?: string }>;
};

type ProdigiResponse<T> = T & {
  outcome: string;
  traceParent?: string;
  issues?: Array<{ errorCode?: string; description?: string }>;
};

function baseUrl(): string {
  return (process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com").replace(/\/$/, "");
}

function apiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  return key;
}

export class ProdigiError extends Error {
  constructor(
    message: string,
    public status: number,
    public outcome?: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ProdigiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<ProdigiResponse<T>> {
  const res = await fetch(`${baseUrl()}/v4.0${path}`, {
    ...init,
    headers: {
      "X-API-Key": apiKey(),
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let body: ProdigiResponse<T> | undefined;
  try {
    body = text ? (JSON.parse(text) as ProdigiResponse<T>) : undefined;
  } catch {
    body = undefined;
  }
  if (!res.ok || !body) {
    throw new ProdigiError(
      `Prodigi ${init?.method || "GET"} ${path} failed (${res.status}): ${text.slice(0, 500)}`,
      res.status,
      body?.outcome,
      body ?? text,
    );
  }
  return body;
}

const OK_OUTCOMES = new Set(["created", "createdwithissues", "alreadyexists", "ok", "onhold"]);

export async function createOrder(order: ProdigiOrderRequest): Promise<{ order: ProdigiOrder; outcome: string }> {
  const body = await request<{ order: ProdigiOrder }>("/Orders", {
    method: "POST",
    body: JSON.stringify(order),
  });
  if (!OK_OUTCOMES.has(String(body.outcome).toLowerCase()) || !body.order) {
    throw new ProdigiError(
      `Prodigi refused the order (${body.outcome}): ${JSON.stringify(body.issues ?? body).slice(0, 500)}`,
      200,
      body.outcome,
      body,
    );
  }
  return { order: body.order, outcome: body.outcome };
}

export async function getOrder(id: string): Promise<ProdigiOrder> {
  const body = await request<{ order: ProdigiOrder }>(`/Orders/${encodeURIComponent(id)}`);
  if (!body.order) {
    throw new ProdigiError(`Prodigi order ${id} not found (${body.outcome})`, 404, body.outcome, body);
  }
  return body.order;
}

/** Human, and slightly unserious, description of a Prodigi order stage. */
export function describeStage(order: ProdigiOrder | null | undefined): {
  key: "queued" | "printing" | "shipped" | "done" | "cancelled" | "hold" | "unknown";
  label: string;
  blurb: string;
} {
  if (!order) {
    return { key: "queued", label: "Sending to the printer", blurb: "Any millisecond now." };
  }
  const stage = order.status?.stage;
  const shipped = order.shipments?.some((s) => s.dispatchDate || s.tracking?.number);
  if (stage === "Complete" || shipped) {
    return {
      key: shipped && stage !== "Complete" ? "shipped" : "done",
      label: shipped ? "Shipped" : "Complete",
      blurb: "Your number is in a box, moving through space at a modest speed.",
    };
  }
  if (stage === "Cancelled") {
    return { key: "cancelled", label: "Cancelled", blurb: "This one didn't make it. Time is cruel." };
  }
  if (stage === "OnHold") {
    return { key: "hold", label: "On hold", blurb: "The printer has a question. We are answering it." };
  }
  if (stage === "InProgress") {
    const d = order.status?.details || {};
    if (d.inProduction === "InProgress" || d.inProduction === "Complete") {
      return { key: "printing", label: "Printing", blurb: "A machine is putting your number on a shirt right now." };
    }
    return { key: "printing", label: "In progress", blurb: "The printer has your number and is thinking about it." };
  }
  if (stage === "Draft" || stage === "AwaitingPayment") {
    return { key: "queued", label: "Received", blurb: "The printer has acknowledged your number." };
  }
  return { key: "unknown", label: stage || "Unknown", blurb: "We are as curious as you are." };
}
