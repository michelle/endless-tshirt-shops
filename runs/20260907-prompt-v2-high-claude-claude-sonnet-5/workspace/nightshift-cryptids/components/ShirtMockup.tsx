// A lightweight, dependency-free "product photo": an SVG t-shirt silhouette
// in the chosen color with the design badge overlaid on the chest. This
// keeps color-swapping instant (no per-color renders to generate/host) while
// still giving each product page a real, on-brand product shot.

const OUTLINE: Record<string, string> = {
  black: "#000000",
  white: "#c9c9c9",
  "navy blue": "#050912",
};

export function ShirtMockup({
  colorHex,
  colorKey,
  artSrc,
  alt,
}: {
  colorHex: string;
  colorKey: string;
  artSrc: string;
  alt: string;
}) {
  const outline = OUTLINE[colorKey] ?? "#00000030";
  return (
    <div className="relative w-full aspect-square">
      <svg
        viewBox="0 0 400 400"
        className="absolute inset-0 h-full w-full drop-shadow-xl"
      >
        <path
          d="M 130 40
             L 160 25
             C 172 45 228 45 240 25
             L 270 40
             L 330 95
             L 300 130
             L 278 112
             L 278 375
             L 122 375
             L 122 112
             L 100 130
             L 70 95
             Z"
          fill={colorHex}
          stroke={outline}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M 160 25 C 172 45 228 45 240 25"
          fill="none"
          stroke={outline}
          strokeWidth="3"
          opacity="0.6"
        />
      </svg>
      <img
        src={artSrc}
        alt={alt}
        className="absolute left-1/2 top-[32%] w-[34%] -translate-x-1/2 -translate-y-1/2 drop-shadow-md"
      />
    </div>
  );
}
