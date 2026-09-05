import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#8b70ff",
  colorScheme: "light",
};

export async function generateMetadata(): Promise<Metadata> {
  const incomingHeaders = await headers();
  const host = incomingHeaders.get("x-forwarded-host") || incomingHeaders.get("host") || "localhost:3000";
  const protocol = incomingHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const title = "datetime.store — Wear this exact moment";
  const description = "A one-of-one timestamp T-shirt, printed at the instant you make it yours.";

  return {
    metadataBase,
    title,
    description,
    applicationName: "datetime.store",
    keywords: ["timestamp shirt", "custom t-shirt", "unix time", "one-of-one gift"],
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "datetime.store",
      url: "/",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "A black datetime.store timestamp T-shirt" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
