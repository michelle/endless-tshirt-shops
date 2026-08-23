import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "datetime.store — a shirt for this exact moment",
  description: "A limited-edition t-shirt printed with the exact time you buy it.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
