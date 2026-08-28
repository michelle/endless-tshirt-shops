import "./globals.css";

export const metadata = {
  title: "datetime.store — a shirt for right now",
  description: "A t-shirt printed with the exact millisecond you decided to exist.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
