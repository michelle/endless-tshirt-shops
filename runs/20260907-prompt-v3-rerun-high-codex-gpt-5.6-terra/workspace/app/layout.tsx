import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Star Signal Studio | Your sky, printed",
  description: "One-of-one cosmic field-note t-shirts, composed from your name, place and sign."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
