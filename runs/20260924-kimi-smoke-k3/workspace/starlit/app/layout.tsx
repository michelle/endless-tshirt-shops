import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Starlit — The sky that made you",
  description:
    "A museum-quality star map of the exact night sky over your place, at your moment — printed on demand on a Bella+Canvas tee.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
