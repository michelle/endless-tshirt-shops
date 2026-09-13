import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Tiny Triumphs — wear the win", description: "One-of-one DTG tees for the wins only you noticed." };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
