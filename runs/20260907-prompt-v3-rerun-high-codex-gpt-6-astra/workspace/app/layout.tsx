import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Field Notes Club — Your place. Your people. Your park.",
  description:
    "Turn your favorite place and favorite people into a personal park tee. Original landscape artwork, customized for you and printed to order.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
