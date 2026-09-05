import type { Metadata } from "next";
import Order from "./Order";
export const metadata: Metadata = {
  title: "Your moment — datetime.store",
  description: "Your private datetime tee order status.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Your moment — datetime.store",
    description: "Your private datetime tee order status.",
    images: [],
  },
  twitter: {
    title: "Your moment — datetime.store",
    description: "Your private datetime tee order status.",
    images: [],
  },
};
export default function OrderPage() {
  return <Order />;
}
