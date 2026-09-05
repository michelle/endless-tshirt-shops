import type { Metadata } from "next";
import Receipt from "./receipt";
export const metadata: Metadata = {
  title: "Your moment — datetime.store",
  robots: { index: false, follow: false },
};
export default function Success() {
  return <Receipt />;
}
