"use client";

import { useEffect, useRef } from "react";
import { ensureFontsReady, renderDesignToCanvas } from "@/lib/renderDesign";
import { CANVAS_ASPECT } from "@/lib/constellation";

export default function DesignCanvas({ phrase, subtitle, paletteKey, shirtIsDark, resolution = 640 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    ensureFontsReady().then(() => {
      if (cancelled || !canvasRef.current) return;
      renderDesignToCanvas(canvasRef.current, { phrase, subtitle, paletteKey, shirtIsDark });
    });
    return () => {
      cancelled = true;
    };
  }, [phrase, subtitle, paletteKey, shirtIsDark]);

  return (
    <canvas
      ref={canvasRef}
      width={resolution}
      height={Math.round(resolution / CANVAS_ASPECT)}
      className="h-full w-full"
    />
  );
}
