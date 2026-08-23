import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://datetime.store";
  return ["", "/terms", "/privacy"].map((path) => ({ url: `${base}${path}`, lastModified: new Date() }));
}
