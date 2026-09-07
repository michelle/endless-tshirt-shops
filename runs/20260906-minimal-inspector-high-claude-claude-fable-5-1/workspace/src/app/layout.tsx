import type { Metadata, Viewport } from "next";
import "./globals.css";
import { chivo } from "./fonts";

export const metadata: Metadata = {
  title: "the datetime store",
  description: "we sell a t-shirt with the current datetime.",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "datetime.store",
    description: "we sell a t-shirt with the current datetime.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={chivo.variable}>
      <body>{children}</body>
    </html>
  );
}
