import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = h.get("host");
  const origin =
    process.env.APP_URL ??
    `${host?.startsWith("localhost") ? "http" : "https"}://${host}`;
  const title = "datetime.store — Wear this moment.";
  const description =
    "A black tee. A single timestamp. Capture the current moment in milliseconds and wear it forever.";
  return {
    metadataBase: new URL(origin),
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "datetime.store",
      images: [
        {
          url: `${origin}/og.png`,
          width: 1732,
          height: 908,
          alt: "Wear this moment. A black tee. A single timestamp.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/og.png`],
    },
    robots:
      process.env.NEXT_PUBLIC_APP_MODE !== "live"
        ? { index: false, follow: true }
        : { index: true, follow: true },
  };
}
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
