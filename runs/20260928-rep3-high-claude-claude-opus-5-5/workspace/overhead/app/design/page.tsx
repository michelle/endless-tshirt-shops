import type { Metadata } from "next";
import DesignerLoader from "./DesignerLoader";

export const metadata: Metadata = { title: "Design your sky — Overhead" };

export default function DesignPage() {
  return <DesignerLoader />;
}
