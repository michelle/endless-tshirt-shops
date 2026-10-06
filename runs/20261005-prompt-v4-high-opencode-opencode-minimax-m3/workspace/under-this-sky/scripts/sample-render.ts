import fs from "node:fs";
import { snapshot } from "../lib/astronomy";
import { renderDesign } from "../lib/design";
import { svgToPng } from "../lib/render";

(async () => {
  const design = {
    dateIso: "2019-06-14T23:30:00Z",
    lat: 38.7223,
    lng: -9.1393,
    placeName: "Lisbon, Portugal",
    headline: "The Night We Met",
    subtitle: "Elena & Marco",
    message: ["And so the adventure began."],
    palette: "ink" as const,
    garment: "black" as const,
  };
  const sky = snapshot({ whenUtc: new Date(design.dateIso), lat: design.lat, lng: design.lng, placeName: design.placeName });
  const out = renderDesign(design, sky);
  const png = await svgToPng(out.svg, { width: 1500 });
  fs.writeFileSync("/tmp/sample-print.png", png.buffer);
  console.log("wrote /tmp/sample-print.png", png.buffer.length, "bytes");
})();
