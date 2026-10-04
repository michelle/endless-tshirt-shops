import path from 'path'
import { Resvg } from '@resvg/resvg-js'
import { zonedTimeToUtc } from '@/lib/sky/astro'
import { buildChart } from '@/lib/sky/chart'
import { renderDesignSVG } from '@/lib/sky/svg'
import { decodeSpec } from '@/lib/spec'

export const dynamic = 'force-dynamic'

// GET /api/print/<designId>/file.png
// Regenerates the print file deterministically from the design spec encoded in
// the id. 4680x5790 (300 dpi over the 15.6" x 19.3" front print area).
// Optional query params (for previews only; Prodigi always gets the default):
//   w=<width>   render width in px (default 4680)
//   bg=<color>  background colour (default transparent)
const FONT_DIR = path.join(process.cwd(), 'public', 'fonts')
const FONT_FILES = [
  'Cinzel-400.ttf',
  'Cinzel-700.ttf',
  'DMSerifDisplay-Regular.ttf',
  'DMSerifDisplay-Italic.ttf',
  'PlexMono-Light.ttf',
  'Barlow-Medium.ttf',
  'Barlow-SemiBold.ttf',
].map((f) => path.join(FONT_DIR, f))

export async function GET(request, ctx) {
  const { id } = await ctx.params
  const spec = decodeSpec(id)
  if (!spec) {
    return new Response('unknown or invalid design id', { status: 404 })
  }

  const url = new URL(request.url)
  let width = parseInt(url.searchParams.get('w') || '4680', 10)
  if (!Number.isInteger(width) || width < 120 || width > 4680) width = 4680
  let background = 'rgba(0,0,0,0)'
  const bg = url.searchParams.get('bg')
  if (bg && /^#[0-9a-fA-F]{6}$/.test(bg)) background = bg

  try {
    const date = zonedTimeToUtc(spec.d, spec.tm, spec.tz)
    const chart = buildChart(date, spec.la, spec.lo, { magLimit: 5.05 })
    const svg = renderDesignSVG(spec, chart)

    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: width },
      font: {
        fontFiles: FONT_FILES,
        loadSystemFonts: false,
        defaultFontFamily: 'Cinzel',
      },
      background,
    })
    const png = resvg.render().asPng()
    return new Response(png, {
      headers: {
        'content-type': 'image/png',
        // design id fully encodes the design: same id => same file
        'cache-control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    console.error('print render failed', err)
    return new Response('print render failed', { status: 500 })
  }
}
