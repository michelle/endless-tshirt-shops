"use client";
import { useEffect, useState } from "react";
import { DesignPreview } from "./DesignPreview";
import { DEFAULT_DESIGN, type Design } from "@/lib/design";

/** Hero shows today's sky so every visit is a little different. */
export function HeroArt() {
  const [design, setDesign] = useState<Design>(DEFAULT_DESIGN);
  useEffect(() => {
    const now = new Date();
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    setDesign({ ...DEFAULT_DESIGN, date: iso, name: "Today", subtitle: "Wherever you are" });
  }, []);
  return (
    <div className="hero-art">
      <DesignPreview design={design} mode="mockup" className="mock" />
    </div>
  );
}
