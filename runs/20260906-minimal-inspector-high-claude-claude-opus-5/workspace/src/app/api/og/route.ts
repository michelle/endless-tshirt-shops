import { Path2D, createCanvas } from '@napi-rs/canvas';
import { ensureFont } from '@/lib/artwork';

export const runtime = 'nodejs';

const WIDTH = 1200;
const HEIGHT = 630;

/** Tee silhouette from the storefront, drawn in its native 100x125 space. */
const SHIRT_PATH =
  'M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724 C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06 l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z';

/** Social card: the shirt, wearing the time you looked at it. */
export async function GET() {
  const hasFont = ensureFont();
  const family = hasFont ? 'Chivo' : 'sans-serif';
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const scale = 4.5;
  ctx.save();
  ctx.translate(WIDTH - 100 * scale - 75, 60);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#17181a';
  ctx.fill(new Path2D(SHIRT_PATH));

  const stamp = String(Date.now());
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `700 100px ${family}`;
  const stampSize = (28.7 / ctx.measureText(stamp).width) * 100;
  ctx.font = `700 ${stampSize}px ${family}`;
  ctx.fillText(stamp, 50, 38.8);
  ctx.restore();

  ctx.fillStyle = '#111214';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `300 78px ${family}`;
  ctx.fillText('datetime.store', 72, 300);
  ctx.fillStyle = '#337ab7';
  ctx.font = `400 32px ${family}`;
  ctx.fillText('we sell a t-shirt with the current datetime.', 74, 352);
  ctx.fillStyle = '#9aa0a8';
  ctx.font = `400 26px ${family}`;
  ctx.fillText('$22.50 · printed on demand · free US shipping', 74, 398);

  const png = await canvas.encode('png');
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=60, s-maxage=60',
    },
  });
}
