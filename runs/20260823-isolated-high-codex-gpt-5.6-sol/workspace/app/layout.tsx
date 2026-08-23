import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "datetime.store — this moment, printed",
  description: "A one-of-one timestamp tee, printed at the exact millisecond you check out.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  openGraph: {
    title: "datetime.store",
    description: "This moment. On a shirt. Forever.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
