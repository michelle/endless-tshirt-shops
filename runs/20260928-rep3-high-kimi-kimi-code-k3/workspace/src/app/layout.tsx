import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Under This Sky — Custom Star Map T-Shirts",
  description:
    "Wear the exact night sky from your moment. Pick a date, time and place — we print the real stars above it on a premium tee, made just for you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,600&family=Montserrat:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
