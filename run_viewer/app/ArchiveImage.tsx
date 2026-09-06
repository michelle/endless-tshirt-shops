import { assetUrl } from "./asset-url";

type Props = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  unoptimized?: boolean;
  className?: string;
};

/** Serve original image bytes without a server-side image optimizer. */
export default function ArchiveImage({ src, alt, width, height, fill, sizes, className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={assetUrl(src)} alt={alt} width={width} height={height} sizes={sizes} className={className}
      style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%" } : undefined} />
  );
}
