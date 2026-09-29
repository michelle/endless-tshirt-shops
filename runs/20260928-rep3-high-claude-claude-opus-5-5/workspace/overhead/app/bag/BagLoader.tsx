"use client";

import dynamic from "next/dynamic";

const Bag = dynamic(() => import("./Bag"), {
  ssr: false,
  loading: () => <div className="wrap" style={{ padding: "80px 24px", color: "var(--muted)" }}>Loading your bag…</div>,
});

export default function BagLoader() {
  return <Bag />;
}
