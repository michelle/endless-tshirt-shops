import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Somewhere, Always | Your place. Your moment. Your tee.",
  description: "Create a one of one t-shirt inspired by a place, a date, and words that mean something to you.",
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
