import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "the datetime store",
  description: "we sell a t-shirt with the current datetime.",
  metadataBase: process.env.PUBLIC_BASE_URL
    ? new URL(process.env.PUBLIC_BASE_URL)
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
      : undefined,
  openGraph: {
    title: "datetime.store",
    description: "we sell a t-shirt with the current datetime.",
    type: "website",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
