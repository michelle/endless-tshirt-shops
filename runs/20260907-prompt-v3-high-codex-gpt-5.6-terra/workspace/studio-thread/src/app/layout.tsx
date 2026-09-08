import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "The 5:17 Club — Make it yours", description: "A made-for-you ritual tee, printed on demand." };
export default function RootLayout({ children }: LayoutProps<"/">) { return <html lang="en"><body>{children}</body></html>; }
