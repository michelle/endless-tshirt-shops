import type { Metadata } from "next";
import SuccessClient from "./SuccessClient";

export const metadata: Metadata = {
  title: "Your moment is yours — datetime.store",
  description: "Your timestamp T-shirt order has been captured.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Your moment is yours — datetime.store",
    description: "Your timestamp T-shirt order has been captured.",
    images: [],
  },
  twitter: {
    title: "Your moment is yours — datetime.store",
    description: "Your timestamp T-shirt order has been captured.",
    images: [],
  },
};

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  return <SuccessClient sessionId={sessionId} />;
}
