export const PRODIGI_SKU = "GLOBAL-TEE-GIL-5000";

export const catalog = {
  "200-ok": {
    name: "200 OK — The Healthy Build",
    description: "Black heavyweight unisex tee with an electric-cyan status print.",
    color: "black",
    printFile: "200-ok.png",
  },
  "404-offline": {
    name: "404 OFFLINE — The Hard Disconnect",
    description: "Natural heavyweight unisex tee with a struck-through status print.",
    color: "natural",
    printFile: "404-offline.png",
  },
  "418-teapot": {
    name: "418 TEAPOT — The Permanent Teapot",
    description: "Orange heavyweight unisex tee honoring the web’s best permanent joke.",
    color: "orange",
    printFile: "418-teapot.png",
  },
} as const;

export type ProductId = keyof typeof catalog;
export const sizes = ["s", "m", "l", "xl", "2xl", "3xl"] as const;
export type ShirtSize = (typeof sizes)[number];

export function isProductId(value: unknown): value is ProductId {
  return typeof value === "string" && value in catalog;
}

export function isShirtSize(value: unknown): value is ShirtSize {
  return typeof value === "string" && sizes.includes(value as ShirtSize);
}
