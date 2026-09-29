import { Design } from "@/lib/design";
import { renderArtSVG, renderMockupSVG } from "@/lib/render";

/** Inline SVG shirt mockup. Works in server and client components. */
export function Mockup({ design, id }: { design: Design; id: string }) {
  return <div className="shirt" dangerouslySetInnerHTML={{ __html: renderMockupSVG(design, id) }} />;
}

export function FlatArt({ design, id }: { design: Design; id: string }) {
  return <div className="flat-art" dangerouslySetInnerHTML={{ __html: renderArtSVG(design, id) }} />;
}
