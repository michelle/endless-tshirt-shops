import { PNG } from "pngjs";
import { safeTimestamp } from "../../../lib/store";

export const runtime = "nodejs";

const digits: Record<string, string[]> = {
  "0": ["11111", "10001", "10001", "10001", "10001", "10001", "11111"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "11111"],
  "2": ["11111", "00001", "00001", "11111", "10000", "10000", "11111"],
  "3": ["11111", "00001", "00001", "01111", "00001", "00001", "11111"],
  "4": ["10001", "10001", "10001", "11111", "00001", "00001", "00001"],
  "5": ["11111", "10000", "10000", "11111", "00001", "00001", "11111"],
  "6": ["11111", "10000", "10000", "11111", "10001", "10001", "11111"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["11111", "10001", "10001", "11111", "10001", "10001", "11111"],
  "9": ["11111", "10001", "10001", "11111", "00001", "00001", "11111"],
};

export async function GET(request: Request) {
  const timestamp = String(safeTimestamp(new URL(request.url).searchParams.get("timestamp")));
  const width = 4677;
  const height = 5787;
  const scale = 52;
  const spacing = 17;
  const charWidth = 5 * scale;
  const textWidth = timestamp.length * charWidth + (timestamp.length - 1) * spacing;
  const xStart = Math.max(0, Math.floor((width - textWidth) / 2));
  const yStart = 1780;
  const image = new PNG({ width, height });
  for (let index = 0; index < timestamp.length; index += 1) {
    const glyph = digits[timestamp[index]] || digits["0"];
    for (let row = 0; row < glyph.length; row += 1) {
      for (let column = 0; column < glyph[row].length; column += 1) {
        if (glyph[row][column] !== "1") continue;
        for (let dy = 0; dy < scale; dy += 1) {
          for (let dx = 0; dx < scale; dx += 1) {
            const x = xStart + index * (charWidth + spacing) + column * scale + dx;
            const y = yStart + row * scale + dy;
            const pixel = (width * y + x) << 2;
            image.data[pixel] = 247;
            image.data[pixel + 1] = 244;
            image.data[pixel + 2] = 237;
            image.data[pixel + 3] = 255;
          }
        }
      }
    }
  }
  const buffer = PNG.sync.write(image);
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=60" } });
}
