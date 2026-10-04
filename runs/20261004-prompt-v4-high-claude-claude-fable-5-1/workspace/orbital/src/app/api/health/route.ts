import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const fontsDir = path.join(process.cwd(), "public", "fonts");
  let fonts: string[] = [];
  try { fonts = fs.readdirSync(fontsDir); } catch (e) { fonts = [`ERR ${String(e)}`]; }
  let resvg = "ok";
  try { await import("@resvg/resvg-js"); } catch (e) { resvg = `ERR ${String(e)}`; }
  return NextResponse.json({
    ok: true,
    cwd: process.cwd(),
    fonts,
    resvg,
    env: {
      stripe: Boolean(process.env.STRIPE_SECRET_KEY),
      webhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      prodigi: Boolean(process.env.PRODIGI_API_KEY),
      prodigiBase: process.env.PRODIGI_API_BASE ?? null,
      siteUrl: process.env.SITE_URL ?? null,
      signing: Boolean(process.env.ART_SIGNING_SECRET),
    },
  });
}
