"use client";
import { useMemo } from "react";
import type { Design } from "@/lib/design";
import { buildDesignSVG, buildMockupSVG } from "@/lib/render";

/**
 * Renders the exact same SVG the server rasterises for printing, so what the
 * customer sees is what Prodigi receives.
 */
export function DesignPreview({ design, mode, className }: { design: Design; mode: "mockup" | "print"; className?: string }) {
  const svg = useMemo(
    () => (mode === "mockup" ? buildMockupSVG(design) : buildDesignSVG(design, { responsive: true })),
    [design, mode],
  );
  return <div className={className} dangerouslySetInnerHTML={{ __html: svg }} />;
}
