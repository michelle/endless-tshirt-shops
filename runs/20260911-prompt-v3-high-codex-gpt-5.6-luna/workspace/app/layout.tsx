import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PATCHWORK — Signal Goods",
  description: "One-of-one DTG tees generated from your current signal."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
