"use client";

import { useState } from "react";
import { DEFAULT_SIZE, DEFAULT_STYLE, STYLES, type StyleKey } from "@/lib/products";
import ShirtPreview from "@/components/ShirtPreview";
import ProductConfigurator from "@/components/ProductConfigurator";

export default function ProductExperience() {
  const [style, setStyle] = useState<StyleKey>(DEFAULT_STYLE);
  const [size, setSize] = useState<string>(DEFAULT_SIZE);

  function handleStyleChange(next: StyleKey) {
    setStyle(next);
    if (!STYLES[next].sizes.includes(size)) {
      setSize(
        STYLES[next].sizes.includes(DEFAULT_SIZE)
          ? DEFAULT_SIZE
          : STYLES[next].sizes[0]
      );
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center w-full max-w-4xl">
      <ShirtPreview style={style} />
      <ProductConfigurator
        style={style}
        size={size}
        onStyleChange={handleStyleChange}
        onSizeChange={setSize}
      />
    </div>
  );
}
