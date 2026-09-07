import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Night Hike Club — Tees for after dark",
  description: "Small-run graphic tees for people who feel most awake after sunset."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
