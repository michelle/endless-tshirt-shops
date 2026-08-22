import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "datetime.store — a t-shirt with the current datetime",
  description:
    "We sell a t-shirt printed with the exact moment you bought it. Fitted or unisex, DTG printed and shipped to your door.",
  openGraph: {
    title: "datetime.store",
    description: "We sell a t-shirt with the current datetime.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css?family=Chivo:400,500,700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-white text-black">{children}</body>
    </html>
  );
}
