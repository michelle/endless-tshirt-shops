import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Future Fossil Club — Wear your lore",
  description: "A one-of-one museum exhibit tee, made from your name, place and ritual.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
