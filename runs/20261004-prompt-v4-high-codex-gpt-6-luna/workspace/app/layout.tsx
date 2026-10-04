import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbit & Origin — Your moment, made visible",
  description: "Create a one-of-one star map and make it yours on a Bella + Canvas tee, printed to order.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
