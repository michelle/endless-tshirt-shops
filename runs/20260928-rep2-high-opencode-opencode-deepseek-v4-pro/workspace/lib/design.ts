// Shared design/order parameter types and (de)serialization.
// These are stored in Stripe Checkout Session metadata and encoded into the
// deterministic design-image URL that Prodigi fetches.

import { colorById } from "./config";

export interface DesignParams {
  date: string; // YYYY-MM-DD
  lat: number;
  lng: number;
  title: string;
  locationName: string;
  color: string; // Prodigi color attribute
  size: string; // Prodigi size attribute
}

export function inkForColor(color: string): "light" | "dark" {
  return colorById(color).ink;
}

// Build the absolute URL of the deterministic design PNG for a given base URL.
export function buildDesignUrl(baseUrl: string, p: DesignParams): string {
  const q = new URLSearchParams({
    date: p.date,
    lat: String(p.lat),
    lng: String(p.lng),
    title: p.title,
    locationName: p.locationName,
    ink: inkForColor(p.color),
  });
  return `${baseUrl}/api/design?${q.toString()}`;
}

// Parse design params from a design URL's query string (used by the design route).
export function parseDesignQuery(q: URLSearchParams): DesignParams & { ink: "light" | "dark" } {
  const date = q.get("date") ?? "";
  const lat = parseFloat(q.get("lat") ?? "0");
  const lng = parseFloat(q.get("lng") ?? "0");
  const title = q.get("title") ?? "";
  const locationName = q.get("locationName") ?? "";
  const ink = q.get("ink") === "dark" ? "dark" : "light";
  return { date, lat, lng, title, locationName, ink, color: "", size: "" };
}
