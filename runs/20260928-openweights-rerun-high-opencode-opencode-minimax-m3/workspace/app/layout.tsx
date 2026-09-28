import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "StarMap Tee — A night-sky postcard, printed on a shirt",
  description:
    "Pick a moment. Pick a place. We render the night sky exactly as it was — moon, constellations, stars — and DTG-print it on a tee. One of one. Forever theirs.",
  metadataBase: undefined,
  icons: {
    icon: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><circle cx='32' cy='32' r='30' fill='%23050717'/><circle cx='32' cy='32' r='10' fill='%23fff3c4'/><circle cx='14' cy='14' r='2' fill='white'/><circle cx='50' cy='20' r='1.5' fill='white'/><circle cx='44' cy='48' r='2' fill='white'/></svg>",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
