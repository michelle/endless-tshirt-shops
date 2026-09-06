import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Trail Marker Supply — Field Edition 01", description: "Heavyweight trail shirts for people who still stop to read the map." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
