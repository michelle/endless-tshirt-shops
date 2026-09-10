"use client";

import TshirtMockup from "./TshirtMockup";
import DesignCanvas from "./DesignCanvas";
import { getShirtColor } from "@/lib/products";

const EXAMPLES = [
  { phrase: "Grace & Leo", subtitle: "06 . 14 . 2019", paletteKey: "nebula", colorKey: "black" },
  { phrase: "Atlas", subtitle: "Brooklyn, NY", paletteKey: "sunflare", colorKey: "natural" },
  { phrase: "The Nguyens", subtitle: "Est. 2021", paletteKey: "aurora", colorKey: "navy" },
];

export default function ShowcasePreview() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {EXAMPLES.map((ex, i) => {
        const color = getShirtColor(ex.colorKey);
        return (
          <div key={ex.phrase} className={i === 1 ? "mt-0" : "mt-8"}>
            <TshirtMockup colorHex={color.hex}>
              <DesignCanvas
                phrase={ex.phrase}
                subtitle={ex.subtitle}
                paletteKey={ex.paletteKey}
                shirtIsDark={color.dark}
                resolution={320}
              />
            </TshirtMockup>
          </div>
        );
      })}
    </div>
  );
}
