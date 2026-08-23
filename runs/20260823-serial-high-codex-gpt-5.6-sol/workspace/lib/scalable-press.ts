import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { PRODUCTS, SIZES, type Fit, type Size } from "./product";

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

type FulfillmentInput = {
  timestamp: number;
  fit: Fit;
  size: Size;
  address: ShippingAddress;
};

type ApiError = Error & { details?: unknown };

function authHeader() {
  const key = process.env.SP_AUTH;
  if (!key) throw new Error("SP_AUTH is not configured");
  return `Basic ${Buffer.from(`:${key}`).toString("base64")}`;
}

async function parseResponse(response: Response) {
  const text = await response.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    body = { message: text || "Empty response" };
  }
  const embeddedStatus = typeof body.statusCode === "number" ? body.statusCode : 200;
  if (!response.ok || embeddedStatus >= 300) {
    const error = new Error(`Scalable Press request failed (${response.status})`) as ApiError;
    error.details = body;
    throw error;
  }
  return body;
}

async function makeArtwork(timestamp: number) {
  const display = String(timestamp).replace(/[^0-9]/g, "");
  const segments: Record<string, string[]> = {
    "0": ["a", "b", "c", "d", "e", "f"],
    "1": ["b", "c"],
    "2": ["a", "b", "g", "e", "d"],
    "3": ["a", "b", "g", "c", "d"],
    "4": ["f", "g", "b", "c"],
    "5": ["a", "f", "g", "c", "d"],
    "6": ["a", "f", "g", "e", "c", "d"],
    "7": ["a", "b", "c"],
    "8": ["a", "b", "c", "d", "e", "f", "g"],
    "9": ["a", "b", "c", "d", "f", "g"],
  };
  const lines: Record<string, [number, number, number, number]> = {
    a: [16, 8, 84, 8], b: [94, 18, 94, 88], c: [94, 112, 94, 182],
    d: [16, 192, 84, 192], e: [6, 112, 6, 182], f: [6, 18, 6, 88],
    g: [16, 100, 84, 100],
  };
  const digitWidth = 138;
  const digits = [...display].map((digit, index) => segments[digit].map((segment) => {
    const [x1, y1, x2, y2] = lines[segment];
    return `<line x1="${x1 + index * digitWidth}" y1="${y1}" x2="${x2 + index * digitWidth}" y2="${y2}" />`;
  }).join("")).join("");

  const glyphs: Record<string, string[]> = {
    A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    N: ["10001", "11001", "11001", "10101", "10011", "10011", "10001"],
    O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  };
  const caption = "THIS EXACT MOMENT";
  const pixel = 10;
  const glyphAdvance = 68;
  const captionWidth = caption.length * glyphAdvance - 8;
  const captionX = (2400 - captionWidth) / 2;
  const captionRects = [...caption].map((letter, letterIndex) => glyphs[letter].map((row, y) => [...row].map((on, x) => on === "1"
    ? `<rect x="${captionX + letterIndex * glyphAdvance + x * pixel}" y="${500 + y * pixel}" width="${pixel}" height="${pixel}" />`
    : "").join("")).join("")).join("");
  const digitX = (2400 - (display.length * digitWidth - 38)) / 2;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="2400" height="720" viewBox="0 0 2400 720">
      <g transform="translate(${digitX} 110)" fill="none" stroke="white" stroke-width="14" stroke-linecap="round">${digits}</g>
      <rect x="260" y="420" width="1880" height="6" fill="white" opacity=".9"/>
      <g fill="white">${captionRects}</g>
    </svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

async function createDesign(timestamp: number) {
  const artwork = await makeArtwork(timestamp);
  // Scalable Press v2 predates the WHATWG FormData encoding used by Node's
  // fetch. A fixed-length multipart body keeps this compatible with its parser.
  const boundary = `datetime-store-${randomUUID()}`;
  const field = (name: string, value: string) => Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
  );
  const body = Buffer.concat([
    field("type", "dtg"),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="sides[front][artwork]"; filename="artwork.png"\r\nContent-Type: image/png\r\n\r\n`),
    artwork,
    Buffer.from("\r\n"),
    field("sides[front][dimensions][width]", "8"),
    field("sides[front][position][horizontal]", "C"),
    field("sides[front][position][offset][top]", "3"),
    Buffer.from(`--${boundary}--\r\n`),
  ]);

  const response = await fetch(`${API_BASE}/design`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": String(body.byteLength),
    },
    body: new Uint8Array(body),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await parseResponse(response);
  if (typeof payload.designId !== "string") throw new Error("Scalable Press did not return a design ID");
  return payload.designId;
}

async function createQuote(input: FulfillmentInput, designId: string) {
  const response = await fetch(`${API_BASE}/quote`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "dtg",
      products: [{
        id: PRODUCTS[input.fit],
        color: "Black",
        quantity: 1,
        size: SIZES[input.size],
      }],
      designId,
      address: input.address,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await parseResponse(response);
  const issues = [...((body.issues as unknown[]) || []), ...((body.orderIssues as unknown[]) || [])];
  if (issues.length) {
    const error = new Error("Scalable Press could not quote this address") as ApiError;
    error.details = issues;
    throw error;
  }
  if (typeof body.orderToken !== "string") throw new Error("Scalable Press did not return an order token");
  return body.orderToken;
}

async function placeOrder(orderToken: string) {
  const response = await fetch(`${API_BASE}/order`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ orderToken }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await parseResponse(response);
  if (typeof body.orderId !== "string") throw new Error("Scalable Press did not return an order ID");
  return body.orderId;
}

export async function sendToScalablePress(input: FulfillmentInput) {
  const designId = await createDesign(input.timestamp);
  const orderToken = await createQuote(input, designId);

  if (process.env.SP_PLACE_ORDERS !== "true") {
    return { status: "quoted" as const, reference: orderToken, designId };
  }

  const orderId = await placeOrder(orderToken);
  return { status: "fulfilled" as const, reference: orderId, designId };
}
