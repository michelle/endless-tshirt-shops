const sharp = require("sharp");
const opentype = require("opentype.js");
const env = require("../../lib/env");
const StarMap = require("../../shared/starmap");
const skydata = require("../../assets/skydata.json");
const { verify, decodeDesign } = require("../../lib/sign");
const { sendJson } = require("../../lib/http");

// Embedded fonts (bundled as binary by esbuild) — serverless runtimes have no
// system fonts, so text is converted to vector paths instead of <text> elements.
const marcellusBin = require("../../assets/fonts/Marcellus-Regular.ttf");
const crimsonBin = require("../../assets/fonts/CrimsonText-Regular.ttf");
const crimsonItalicBin = require("../../assets/fonts/CrimsonText-Italic.ttf");

function toArrayBuffer(u8) {
  const b = (u8 && u8.default) || u8;
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

// opentype.js can't process the GSUB contextual substitutions in these fonts;
// dropping the table leaves plain glyph outlines, which is all we need.
function parseFont(u8) {
  const font = opentype.parse(toArrayBuffer(u8));
  delete font.tables.gsub;
  return font;
}

const FONTS = {
  serif: parseFont(marcellusBin),
  sans: parseFont(crimsonBin),
  italic: parseFont(crimsonItalicBin),
};

function textToPath(s, o) {
  const font = FONTS[o.font] || FONTS.serif;
  const ls = o.spacing / o.size; // px spacing → em units
  const adv = font.getAdvanceWidth(s, o.size, { kerning: false, letterSpacing: ls });
  const x = o.x - adv / 2;
  let y = o.y;
  if (o.central) y += o.size * 0.34; // optically center capitals
  const d = font.getPath(s, x, y, o.size, { kerning: false, letterSpacing: ls }).toPathData(2);
  return '<path d="' + d + '" fill="' + o.fill + '"' + (o.opacity < 1 ? ' fill-opacity="' + o.opacity + '"' : "") + "/>";
}

// GET /api/art?d=<base64url design>&sig=<hmac>[&w=preview width][&format=svg]
// Deterministic, stateless: regenerates the same print file on every call,
// so Prodigi (and anyone with the signed URL) can fetch it at any time.
module.exports = async (req, res) => {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method not allowed" });
  const q = req.query || {};
  let design;
  try {
    design = decodeDesign(q.d);
  } catch (e) {
    return sendJson(res, 400, { error: "bad design payload" });
  }
  if (!verify(design, q.sig, env.get("ART_SIGNING_SECRET"))) {
    return sendJson(res, 403, { error: "bad signature" });
  }

  const svg = StarMap.generate({
    date: new Date(design.iso),
    lat: design.lat,
    lon: design.lon,
    title: design.title,
    subtitle: design.subtitle,
    place: design.place,
    ink: design.ink,
    data: skydata,
    textToPath,
  });

  if (q.format === "svg") {
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.statusCode = 200;
    return res.end(svg);
  }

  try {
    const width = Math.min(4500, Math.max(200, parseInt(q.w, 10) || 4500));
    const png = await sharp(Buffer.from(svg), { density: 216 })
      .resize(width, Math.round(width * 1.2))
      .png()
      .toBuffer();
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.statusCode = 200;
    res.end(png);
  } catch (e) {
    console.error("render failed:", e);
    return sendJson(res, 500, { error: "render failed" });
  }
};
