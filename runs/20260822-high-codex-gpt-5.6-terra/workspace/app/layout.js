import "./globals.css";

export const metadata = {
  title: "datetime.store — a t-shirt for right now",
  description: "A black t-shirt printed with the exact moment you order it.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
