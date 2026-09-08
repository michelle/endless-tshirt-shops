/** Renders a generated SVG string inline. Works in server and client components. */
export function PlantSvg({ svg, className }: { svg: string; className?: string }) {
  return <div className={`plate ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}
