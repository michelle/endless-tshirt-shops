import "./globals.css";

export const metadata = {
  title: "datetime.store — wear the moment",
  description: "A tiny, made-to-order souvenir of the exact moment you're in.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
