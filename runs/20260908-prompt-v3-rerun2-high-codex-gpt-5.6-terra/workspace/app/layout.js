import "./globals.css";

export const metadata = {
  title: "Signal Foundry — Wear the moment",
  description: "One-of-one field signal shirts, generated for the person and place that matter to you.",
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
