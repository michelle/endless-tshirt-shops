import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stellara — Custom Star Map T-Shirts",
  description:
    "Wear the night you'll never forget. A custom star map of any date and place, printed on a premium t-shirt.",
};

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
