export type StatusClass = 1 | 2 | 3 | 4 | 5;

export interface StatusCode {
  code: number;
  phrase: string;
  /** Short, printable body line for the "response" design and product copy. */
  quip: string;
  /** Longer copy for the product page. */
  blurb: string;
  unofficial?: boolean;
}

export const STATUS_CODES: StatusCode[] = [
  { code: 100, phrase: "Continue", quip: "go on, I'm listening", blurb: "For people who are still loading. The handshake is done; the rest of you is on its way." },
  { code: 101, phrase: "Switching Protocols", quip: "brb, upgrading", blurb: "You have agreed to the upgrade. What you are upgrading to is nobody's business." },
  { code: 200, phrase: "OK", quip: "everything is fine", blurb: "The most reassuring three characters in computing. Nothing went wrong. Wear it on the days that are true." },
  { code: 201, phrase: "Created", quip: "something new exists now", blurb: "For new parents, new founders, and anyone who shipped something this week." },
  { code: 202, phrase: "Accepted", quip: "queued. no promises.", blurb: "The request was received and will be handled eventually. A shirt for people with a very long to-do list." },
  { code: 204, phrase: "No Content", quip: "", blurb: "Success with nothing to say. The introvert's status code." },
  { code: 206, phrase: "Partial Content", quip: "some assembly required", blurb: "You got some of it. The rest is coming in a later range request." },
  { code: 301, phrase: "Moved Permanently", quip: "new address, same me", blurb: "For people who just moved, changed jobs, or left the group chat for good." },
  { code: 302, phrase: "Found", quip: "temporarily somewhere else", blurb: "You are here, but not really. Check back later at the original location." },
  { code: 304, phrase: "Not Modified", quip: "still the same. use cache.", blurb: "Nothing has changed since you last checked. A shirt for the consistent." },
  { code: 307, phrase: "Temporary Redirect", quip: "same request, over there", blurb: "Going somewhere else for now. Method and body preserved." },
  { code: 400, phrase: "Bad Request", quip: "that's not how you ask", blurb: "The server could not understand what you wanted. Neither could anyone else." },
  { code: 401, phrase: "Unauthorized", quip: "who are you, again?", blurb: "Credentials required. For bouncers, gatekeepers, and people who lock their laptop." },
  { code: 402, phrase: "Payment Required", quip: "reserved for future use", blurb: "Reserved since 1997 and still waiting. The status code of every freelancer's inbox." },
  { code: 403, phrase: "Forbidden", quip: "I know who you are. still no.", blurb: "Identity confirmed, access denied. It is not a bug, it is a policy." },
  { code: 404, phrase: "Not Found", quip: "the page you seek is gone", blurb: "The classic. Wear it and watch people check their shoes for your missing something." },
  { code: 405, phrase: "Method Not Allowed", quip: "not like that", blurb: "The resource exists. Your approach does not work on it." },
  { code: 408, phrase: "Request Timeout", quip: "you took too long", blurb: "The server got tired of waiting. A shirt for the perpetually late and those who love them." },
  { code: 409, phrase: "Conflict", quip: "merge manually", blurb: "Two versions of the truth, and the server refuses to pick one. Resolve and try again." },
  { code: 410, phrase: "Gone", quip: "and not coming back", blurb: "More final than 404. It was here, it is not now, stop asking." },
  { code: 413, phrase: "Payload Too Large", quip: "that's a lot", blurb: "The request body exceeded what the server was willing to process. Ideal post-buffet wear." },
  { code: 418, phrase: "I'm a teapot", quip: "short and stout", blurb: "RFC 2324, Hyper Text Coffee Pot Control Protocol. The most beloved joke in the HTTP spec, and the reason this store exists." },
  { code: 420, phrase: "Enhance Your Calm", quip: "you are being rate limited", blurb: "Twitter's old rate-limit response. Unofficial, and better than the official one.", unofficial: true },
  { code: 422, phrase: "Unprocessable Content", quip: "understood. cannot comply.", blurb: "The syntax was fine. The meaning was the problem." },
  { code: 425, phrase: "Too Early", quip: "let me finish my coffee", blurb: "The server refuses to process a request that might be replayed. Also the morning person's nemesis." },
  { code: 429, phrase: "Too Many Requests", quip: "please slow down", blurb: "For parents of toddlers, on-call engineers, and anyone with an open door policy they regret." },
  { code: 451, phrase: "Unavailable For Legal Reasons", quip: "ask my lawyer", blurb: "Named for Fahrenheit 451. The response you send when you legally cannot send anything else." },
  { code: 500, phrase: "Internal Server Error", quip: "something broke inside", blurb: "The honest one. Something went wrong and nobody is sure what." },
  { code: 501, phrase: "Not Implemented", quip: "coming soon (never)", blurb: "The server recognises the request, but has not gotten around to it. Roadmap TBD." },
  { code: 502, phrase: "Bad Gateway", quip: "the other guy said something weird", blurb: "It is not my fault, it is upstream. The proxy's favourite excuse." },
  { code: 503, phrase: "Service Unavailable", quip: "back soon, probably", blurb: "Down for maintenance. For sick days, holidays, and Sunday mornings." },
  { code: 504, phrase: "Gateway Timeout", quip: "still waiting on upstream", blurb: "The gateway waited as long as it could. Upstream never answered." },
  { code: 507, phrase: "Insufficient Storage", quip: "no room left", blurb: "The server has run out of space. Same." },
  { code: 508, phrase: "Loop Detected", quip: "we've been here before", blurb: "The server terminated an operation because it encountered an infinite loop. Wear it to your weekly recurring meeting." },
  { code: 599, phrase: "Network Connect Timeout Error", quip: "it's always the network", blurb: "Not in any RFC, used by some proxies anyway. The status code of blaming the wifi.", unofficial: true },
];

export const CODE_BY_NUMBER = new Map(STATUS_CODES.map((s) => [s.code, s]));

export function findCode(code: number | string): StatusCode | undefined {
  return CODE_BY_NUMBER.get(Number(code));
}

export function statusClass(code: number): StatusClass {
  return Math.floor(code / 100) as StatusClass;
}

export const CLASS_LABELS: Record<StatusClass, string> = {
  1: "1xx Informational",
  2: "2xx Success",
  3: "3xx Redirection",
  4: "4xx Client Error",
  5: "5xx Server Error",
};

/** Print designs. */
export type DesignStyle = "big" | "response" | "pocket";

export const DESIGN_STYLES: { id: DesignStyle; label: string; description: string }[] = [
  { id: "big", label: "Big", description: "Oversized code, reason phrase underneath." },
  { id: "response", label: "Raw response", description: "The full response, headers and all." },
  { id: "pocket", label: "Pocket", description: "Small chest print. Subtle, for the office." },
];

export type Ink = "white" | "black";

export interface ShirtColor {
  id: string; // Prodigi attribute value
  label: string;
  hex: string;
  ink: Ink;
}

/** Subset of Prodigi GLOBAL-TEE-GIL-64000 colours. `id` is the Prodigi attribute value. */
export const SHIRT_COLORS: ShirtColor[] = [
  { id: "black", label: "Black", hex: "#141414", ink: "white" },
  { id: "white", label: "White", hex: "#f4f4f2", ink: "black" },
  { id: "navy blue", label: "Navy", hex: "#1f2a44", ink: "white" },
  { id: "charcoal", label: "Charcoal", hex: "#3d3d3f", ink: "white" },
  { id: "sport grey", label: "Sport Grey", hex: "#a6a8ab", ink: "black" },
  { id: "forest green", label: "Forest", hex: "#22402c", ink: "white" },
  { id: "maroon", label: "Maroon", hex: "#5a1f2b", ink: "white" },
  { id: "sand", label: "Sand", hex: "#d9c8a8", ink: "black" },
  { id: "red", label: "Red", hex: "#c0272d", ink: "white" },
  { id: "royal blue", label: "Royal", hex: "#2947a8", ink: "white" },
];

export const COLOR_BY_ID = new Map(SHIRT_COLORS.map((c) => [c.id, c]));

export const SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl", "5xl"] as const;
export type Size = (typeof SIZES)[number];

export const PRODIGI_SKU = "GLOBAL-TEE-GIL-64000";
/** Print area for the SKU above, from the Prodigi product catalog. */
export const PRINT_AREA = { width: 4665, height: 5844 };

export const CURRENCY = "usd";
export const BASE_PRICE_CENTS = 2900;
export const SHIPPING_CENTS = 599;

export function priceCents(size: Size): number {
  return ["2xl", "3xl", "4xl", "5xl"].includes(size) ? BASE_PRICE_CENTS + 300 : BASE_PRICE_CENTS;
}

export function formatMoney(cents: number, currency = CURRENCY): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export interface TeeSpec {
  code: number;
  style: DesignStyle;
  color: string;
  size: Size;
}

export function isDesignStyle(v: unknown): v is DesignStyle {
  return DESIGN_STYLES.some((d) => d.id === v);
}
export function isSize(v: unknown): v is Size {
  return (SIZES as readonly string[]).includes(v as string);
}

/** Slug used in print URLs, e.g. 418-big-white.png. */
export function printFileName(code: number, style: DesignStyle, ink: Ink): string {
  return `${code}-${style}-${ink}.png`;
}
export function parsePrintFileName(file: string): { code: StatusCode; style: DesignStyle; ink: Ink } | null {
  const m = /^(\d{3})-([a-z]+)-(white|black)\.png$/.exec(file);
  if (!m) return null;
  const code = findCode(m[1]);
  if (!code || !isDesignStyle(m[2])) return null;
  return { code, style: m[2], ink: m[3] as Ink };
}
/** Colour ids can contain spaces, so they are underscored in mockup URLs. */
export function mockupFileName(code: number, style: DesignStyle, colorId: string): string {
  return `${code}-${style}-${colorId.replace(/\s+/g, "_")}.png`;
}
export function parseMockupFileName(file: string): { code: StatusCode; style: DesignStyle; color: ShirtColor } | null {
  const m = /^(\d{3})-([a-z]+)-([a-z_]+)\.png$/.exec(file);
  if (!m) return null;
  const code = findCode(m[1]);
  const color = COLOR_BY_ID.get(m[3].replace(/_/g, " "));
  if (!code || !color || !isDesignStyle(m[2])) return null;
  return { code, style: m[2], color };
}

/** Countries offered at checkout. All are in Prodigi's shipsTo list for the tee SKU. */
export const SHIP_COUNTRIES = [
  "US", "CA", "GB", "IE", "AU", "NZ", "DE", "FR", "NL", "BE", "ES", "PT", "IT", "AT", "CH",
  "SE", "NO", "DK", "FI", "PL", "CZ", "HU", "RO", "GR", "JP", "KR", "SG", "HK", "TW", "MX", "BR",
] as const;
