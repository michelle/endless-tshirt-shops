import type { Size, WaveformStyle } from "./catalog";

/**
 * A customer design: 480 amplitude samples in [0,1], plus print options.
 * The sample vector is the single source of truth for both the on-screen
 * preview and the server-rendered print file, so what you see is exactly
 * what gets printed.
 */
export interface Design {
  samples: number[];
  style: WaveformStyle;
  ink: string; // hex
  color: string; // Prodigi garment color attribute
  size: Size;
}

export const SAMPLE_COUNT = 480;

/** 6 bits per sample, MSB-first packed, base64url. 480 samples -> 480 chars. */
export function encodeSamples(samples: number[]): string {
  const n = Math.min(samples.length, SAMPLE_COUNT);
  const bytes = new Uint8Array(Math.ceil((n * 6) / 8));
  let bitPos = 0;
  for (let i = 0; i < n; i++) {
    const clamped = Math.max(0, Math.min(1, samples[i]));
    const q = Math.round(clamped * 63) & 63;
    const byteIndex = bitPos >> 3;
    const offset = bitPos & 7;
    bytes[byteIndex] |= q << offset;
    if (offset > 2) bytes[byteIndex + 1] |= q >> (8 - offset);
    bitPos += 6;
  }
  return base64UrlEncode(bytes);
}

export function decodeSamples(encoded: string): number[] {
  const bytes = base64UrlDecode(encoded);
  const out = new Array<number>(SAMPLE_COUNT).fill(0);
  let bitPos = 0;
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const byteIndex = bitPos >> 3;
    const offset = bitPos & 7;
    let q = byteIndex < bytes.length ? bytes[byteIndex] >> offset : 0;
    if (offset > 2 && byteIndex + 1 < bytes.length) q |= bytes[byteIndex + 1] << (8 - offset);
    out[i] = (q & 63) / 63;
    bitPos += 6;
  }
  return out;
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Validate + normalize an arbitrary payload into a Design. Throws on bad input. */
export function parseDesign(input: unknown): Design {
  const d = input as Partial<Design>;
  if (!d || !Array.isArray(d.samples) || d.samples.length < 8) {
    throw new Error("design samples missing");
  }
  if (d.style !== "line" && d.style !== "fill") throw new Error("bad style");
  if (typeof d.ink !== "string" || !/^#[0-9a-fA-F]{6}$/.test(d.ink)) throw new Error("bad ink");
  if (typeof d.color !== "string" || d.color.length > 40) throw new Error("bad color");
  if (typeof d.size !== "string" || d.size.length > 4) throw new Error("bad size");
  const samples = d.samples.slice(0, SAMPLE_COUNT).map((s) => {
    const n = Number(s);
    if (!Number.isFinite(n)) throw new Error("bad sample");
    return Math.max(0, Math.min(1, n));
  });
  while (samples.length < SAMPLE_COUNT) samples.push(0);
  return {
    samples,
    style: d.style,
    ink: d.ink.toLowerCase(),
    color: d.color.toLowerCase(),
    size: d.size.toLowerCase() as Size,
  };
}
