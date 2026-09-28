"use client";

import { useId, useMemo } from "react";
import type { Design } from "@/lib/design";
import { plateSvg } from "@/lib/specimen";
import { mockupSvg } from "@/lib/mockup";
import { colorById } from "@/lib/catalog";

/** Renders the exact same SVG the print pipeline rasterises, either on a tee or as the flat print file. */
export function Specimen({ design, view = "shirt", className }: { design: Design; view?: "shirt" | "plate"; className?: string }) {
  const uid = useId();
  const svg = useMemo(
    () =>
      view === "shirt"
        ? mockupSvg(design, { uid })
        : plateSvg(design, { uid, background: colorById(design.color)?.hex }),
    [design, view, uid],
  );
  return <div className={className} role="img" aria-label={`${design.genus} specimen plate for ${design.name}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}
