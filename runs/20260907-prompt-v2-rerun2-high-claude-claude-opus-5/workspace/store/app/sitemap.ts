import type { MetadataRoute } from "next";
import { SAINTS } from "@/lib/catalog";

const base =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base, priority: 1 },
    { url: `${base}/about`, priority: 0.6 },
    { url: `${base}/legal`, priority: 0.3 },
    ...SAINTS.map((s) => ({ url: `${base}/shirt/${s.slug}`, priority: 0.9 })),
  ];
}
