import crypto from "crypto";

const SECRET = process.env.ART_SIGNING_SECRET || "dev-art-secret-change-me";

export function signArtParams(params) {
  // params: { w, p, c, s } — word, palette, color, size (shirt attrs for cache-busting clarity)
  const base = `w=${params.w}&p=${params.p}&c=${params.c}&s=${params.s}`;
  const sig = crypto.createHmac("sha256", SECRET).update(base).digest("hex").slice(0, 24);
  return `${base}&sig=${sig}`;
}

export function verifyArtParams(searchParams) {
  const w = searchParams.get("w") || "";
  const p = searchParams.get("p") || "";
  const c = searchParams.get("c") || "";
  const s = searchParams.get("s") || "";
  const sig = searchParams.get("sig") || "";
  const base = `w=${w}&p=${p}&c=${c}&s=${s}`;
  const expected = crypto.createHmac("sha256", SECRET).update(base).digest("hex").slice(0, 24);
  const ok =
    sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  return { ok, w, p, c, s };
}
