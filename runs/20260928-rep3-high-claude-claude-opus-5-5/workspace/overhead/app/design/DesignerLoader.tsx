"use client";

import dynamic from "next/dynamic";

// The designer reads the bag from localStorage, so it only renders in the browser.
const Designer = dynamic(() => import("./Designer"), {
  ssr: false,
  loading: () => <div className="wrap" style={{ padding: "80px 24px", color: "var(--muted)" }}>Loading the sky…</div>,
});

export default function DesignerLoader() {
  return <Designer />;
}
