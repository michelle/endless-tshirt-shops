import { redirect } from "next/navigation";
import { SHIRT_COLORS, SHIRT_SIZES, parseDesign, skyInputOf } from "@/lib/design";
import BuyPanel from "@/components/BuyPanel";

export const dynamic = "force-dynamic";

export default function PreviewPage({
  searchParams,
}: {
  searchParams: { [k: string]: string | undefined };
}) {
  const candidate = {
    date: searchParams.date ?? "",
    lat: Number(searchParams.lat ?? "NaN"),
    lon: Number(searchParams.lon ?? "NaN"),
    place: searchParams.place ?? "",
    title: searchParams.title ?? "",
    shirt: {
      color: searchParams.color ?? "black",
      size: searchParams.size ?? "m",
    },
  };

  // If we're missing required fields, just bounce back to the form rather
  // than render a confusing empty page.
  const design = parseDesign(candidate);
  if (!design) {
    redirect("/");
  }

  const sky = skyInputOf(design);
  const previewSrc = `/api/preview-svg?${new URLSearchParams({
    date: sky.date,
    lat: sky.lat.toFixed(2),
    lon: sky.lon.toFixed(2),
    title: sky.title,
    ...(sky.place ? { place: sky.place } : {}),
  }).toString()}`;

  return (
    <main className="container">
      <header style={{ marginBottom: 24 }}>
        <p className="kicker">Preview</p>
        <h1
          className="hero"
          style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", margin: "8px 0 0" }}
        >
          {sky.title}
        </h1>
        <p style={{ color: "var(--ink-soft)", marginTop: 6 }}>
          {sky.date} · {sky.place ?? `${sky.lat.toFixed(2)}°, ${sky.lon.toFixed(2)}°`}
        </p>
        <p style={{ marginTop: 10 }}>
          <a href="/" className="button secondary" style={{ fontSize: "0.9rem", padding: "8px 16px" }}>
            ← Edit the moment
          </a>
        </p>
      </header>

      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="col" style={{ flex: "1 1 380px" }}>
          <div className="preview-stage" style={{ padding: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewSrc} alt="Design preview" />
          </div>
          <p style={{ color: "var(--ink-dim)", fontSize: "0.85rem", textAlign: "center", margin: 0 }}>
            Preview is the same SVG the printer receives &mdash;
            <a href={`/api/asset?${new URLSearchParams({
              date: sky.date,
              lat: sky.lat.toFixed(2),
              lon: sky.lon.toFixed(2),
              title: sky.title,
              ...(sky.place ? { place: sky.place } : {}),
            }).toString()}`}> download the full PNG</a>.
          </p>
        </div>

        <div style={{ flex: "1 1 320px" }}>
          <BuyPanel
            sky={sky}
            initialColor={design.shirt.color ?? SHIRT_COLORS[0].value}
            initialSize={design.shirt.size ?? SHIRT_SIZES[2].value}
          />
        </div>
      </div>
    </main>
  );
}
