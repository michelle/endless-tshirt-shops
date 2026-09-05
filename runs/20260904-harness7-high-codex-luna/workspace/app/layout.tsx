import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "datetime.store — the present, printed.",
  description: "A wearable timestamp. One black tee with the exact moment you claimed it.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: { title: "datetime.store — the present, printed.", description: "A wearable timestamp. One black tee with the exact moment you claimed it.", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
