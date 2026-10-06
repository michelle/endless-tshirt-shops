// lib/render.ts
// SVG → PNG via resvg, used to ship a 4665×5844 PNG to Prodigi (which
// prefers raster) and also to render live previews on the design page.
//
// We dynamically import @resvg/resvg-js so the native binary is only
// loaded when actually needed. On serverless platforms (Vercel) the
// binary sometimes requires platform-specific optional deps that aren't
// present in the default install graph; lazy-loading means an SVG-only
// response can still work.

export interface PngOptions {
  width?: number;
  height?: number;
  background?: string;
}

export async function svgToPng(
  svg: string,
  opts: PngOptions = {}
): Promise<{ buffer: Buffer; width: number; height: number }> {
  // Dynamic import — only triggered when a caller asks for a PNG.
  const mod = (await import("@resvg/resvg-js")) as typeof import("@resvg/resvg-js");
  const resvg = new mod.Resvg(svg, {
    background: opts.background ?? "#0a1830",
    fitTo: opts.width
      ? { mode: "width", value: opts.width }
      : opts.height
      ? { mode: "height", value: opts.height }
      : { mode: "original" },
  });
  const rendered = resvg.render();
  return {
    buffer: rendered.asPng(),
    width: rendered.width,
    height: rendered.height,
  };
}
