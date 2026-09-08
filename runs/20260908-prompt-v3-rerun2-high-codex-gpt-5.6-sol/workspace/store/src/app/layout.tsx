import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal Atlas — A place you can wear",
  description: "Turn a person, place, and moment into a one-of-one DTG printed shirt.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
