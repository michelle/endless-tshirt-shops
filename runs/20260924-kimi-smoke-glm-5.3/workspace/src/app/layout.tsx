import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skyborn — the night sky above your moment, printed once",
  description:
    "Skyborn prints the real night sky — every star, constellation, planet and the moon — exactly as it stood above your place and moment. One sky, one shirt, printed only once, for one person.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="stars" aria-hidden="true" />
        <main>{children}</main>
      </body>
    </html>
  );
}
