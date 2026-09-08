import { ImageResponse } from "next/og";
import { getProduct } from "@/lib/products";
import { BadgeArt } from "@/lib/badge";

export const runtime = "edge";

async function loadFont(file: string) {
  return fetch(new URL(`../../../../assets/fonts/${file}`, import.meta.url)).then((r) =>
    r.arrayBuffer()
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) {
    return new Response("Not found", { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const width = Math.min(
    Math.max(parseInt(searchParams.get("w") ?? "1400", 10) || 1400, 200),
    3000
  );
  const height = Math.round(width * 1.2527); // matches Prodigi tee front print area ratio

  const [oswaldRegular, oswaldBold, archivoBlack] = await Promise.all([
    loadFont("Oswald-Regular.woff"),
    loadFont("Oswald-Bold.woff"),
    loadFont("ArchivoBlack.woff"),
  ]);

  return new ImageResponse(
    <BadgeArt product={product} width={width} height={height} />,
    {
      width,
      height,
      fonts: [
        { name: "Oswald", data: oswaldRegular, weight: 400, style: "normal" },
        { name: "Oswald", data: oswaldBold, weight: 700, style: "normal" },
        { name: "ArchivoBlack", data: archivoBlack, weight: 400, style: "normal" },
      ],
    }
  );
}
