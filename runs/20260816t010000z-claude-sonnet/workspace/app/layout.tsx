import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "datetime.store",
  description: "We sell a t-shirt with the current datetime.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black flex items-center justify-center py-10 px-4">
        {children}
      </body>
    </html>
  );
}
