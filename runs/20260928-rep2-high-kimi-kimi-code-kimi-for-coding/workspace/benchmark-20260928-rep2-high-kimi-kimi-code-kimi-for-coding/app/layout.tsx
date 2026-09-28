import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Echostitch — Wear the sound of someone you love",
  description:
    "Record any sound — a voice, a laugh, a song — and we print its unique waveform as a one-of-one direct-to-garment t-shirt, made to order and shipped worldwide.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
