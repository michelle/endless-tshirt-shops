import type { Metadata } from "next";
import { Suspense } from "react";
import { Customizer } from "@/components/Customizer";

export const metadata: Metadata = { title: "Design your tee" };

export default function DesignPage() {
  return (
    <Suspense>
      <Customizer />
    </Suspense>
  );
}
