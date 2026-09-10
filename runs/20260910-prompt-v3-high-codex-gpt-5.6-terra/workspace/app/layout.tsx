import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Futurefolk — Wear your origin story",
  description: "One-of-one DTG field-guide tees made from your personal coordinates.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
