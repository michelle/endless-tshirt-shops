"use client";

import type { ColorwayId, FitId } from "@/lib/catalog";
import { PrintImage, ShirtBody } from "./ShirtBody";

/** The finished thing, still, with the real print file laid on it. */
export function OrderShirt({
  fit,
  colorway,
  printUrl,
}: {
  fit: FitId;
  colorway: ColorwayId;
  printUrl: string;
}) {
  return (
    <ShirtBody fit={fit} colorway={colorway} className="mx-auto max-w-[420px]">
      {printUrl ? <PrintImage src={printUrl} /> : null}
    </ShirtBody>
  );
}
