// A stylized flat front-view t-shirt silhouette used as the customizer
// mockup. Not a photorealistic garment render (see README "Gaps") - just
// enough for the customer to judge placement, color and scale.

// Percentages (relative to the component box) where the print area sits,
// tuned to line up with the SVG path below.
export const PRINT_AREA = { left: 27, top: 30, width: 46, height: 46 };

export default function TshirtMockup({ colorHex, children, className = "" }) {
  return (
    <div className={`relative w-full ${className}`} style={{ aspectRatio: "5 / 6" }}>
      <svg viewBox="0 0 400 480" className="absolute inset-0 h-full w-full drop-shadow-2xl">
        <path
          d="M160,40
             C120,40 90,48 60,62
             C35,74 18,95 20,150
             C22,175 55,183 95,169
             C90,230 84,320 84,440
             L316,440
             C316,320 310,230 305,169
             C345,183 378,175 380,150
             C382,95 365,74 340,62
             C310,48 280,40 240,40
             C231,66 217,82 200,82
             C183,82 169,66 160,40 Z"
          fill={colorHex}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="2"
        />
        <path
          d="M160,40 C169,66 183,82 200,82 C217,82 231,66 240,40"
          fill="none"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="2"
        />
        <path
          d="M95,169 C90,230 84,320 84,440"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="2"
        />
      </svg>
      <div
        className="absolute overflow-hidden"
        style={{
          left: `${PRINT_AREA.left}%`,
          top: `${PRINT_AREA.top}%`,
          width: `${PRINT_AREA.width}%`,
          height: `${PRINT_AREA.height}%`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
