import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pawtraits — Custom Pet Portrait Tees",
  description:
    "Turn a photo of your pet into a one-of-a-kind illustrated t-shirt, printed on demand with direct-to-garment technology.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#faf7f2] text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
