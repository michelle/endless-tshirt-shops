import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "datetime.store — wear a moment",
  description: "A tiny time machine for your torso.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://datetime.store"),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
