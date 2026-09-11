import { NextRequest } from "next/server";

// Resolve the deployed origin for building absolute URLs (Stripe images,
// Prodigi asset URLs, redirect URLs). Prefers an explicit env var, falls back
// to Vercel's runtime host, then the incoming request.
export function getBaseUrl(req?: NextRequest): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (req) return new URL(req.url).origin;
  return "http://localhost:3000";
}
