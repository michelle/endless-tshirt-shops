import type { Metadata } from "next";
import { Chivo } from "next/font/google";
import "./globals.css";

const chivo = Chivo({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-chivo",
});

export const metadata: Metadata = {
  title: "the datetime store",
  description: "we sell a t-shirt with the current datetime.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={chivo.variable}>{children}</body>
    </html>
  );
}
