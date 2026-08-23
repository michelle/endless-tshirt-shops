import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "datetime.store",
    short_name: "datetime.store",
    description: "This moment. On a shirt. Forever.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f0e8",
    theme_color: "#11110f",
  };
}
