import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ELSEWHERE — Wear a place in time",
  description: "Your place. Your moment. Your own orbit. Create a personalized art T-shirt with a print as individual as your story.",
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
