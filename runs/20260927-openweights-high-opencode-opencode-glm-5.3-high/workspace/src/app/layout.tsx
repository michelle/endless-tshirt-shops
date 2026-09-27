import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Under This Moon — custom moon-phase tees",
  description:
    "The exact moon that hung over your moment, drawn true to its phase and printed on a premium tee. One night, one shirt, printed on demand after you pay.",
  openGraph: {
    title: "Under This Moon",
    description:
      "Wear the sky from your moment. The exact moon phase of your date, printed on demand.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
