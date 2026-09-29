import type { Metadata } from "next";
import BagLoader from "./BagLoader";

export const metadata: Metadata = { title: "Your bag — Overhead" };

export default function BagPage() {
  return <BagLoader />;
}
