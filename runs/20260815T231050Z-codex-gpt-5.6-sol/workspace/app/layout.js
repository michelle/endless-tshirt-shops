import "./globals.css";

export const metadata = {
  title: "datetime.store — a moment, made wearable",
  description: "A black tee printed with the exact millisecond you chose it.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  openGraph: { title: "datetime.store", description: "This moment. On a shirt." },
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
