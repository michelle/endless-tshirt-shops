import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const serif = localFont({
  src: [
    { path: "./fonts/InstrumentSerif-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/InstrumentSerif-Italic.ttf", weight: "400", style: "italic" },
  ],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aster — Custom Night Sky Tees",
  description:
    "Every tee is printed with the exact sky above a moment that matters: your place, your date, your time, rendered to the minute and printed to order.",
  metadataBase: new URL("https://aster.example"),
  openGraph: {
    title: "Aster — Custom Night Sky Tees",
    description: "The night sky above your moment, printed to order on cotton.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={serif.variable}>
      <body>{children}</body>
    </html>
  );
}
