import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Operational self-check: env, wasm presence, font parsing, and a tiny test render. */
export async function GET() {
  const report: Record<string, unknown> = {
    node: process.version,
    cwd: process.cwd(),
    env: {
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
      PRODIGI_API_KEY: !!process.env.PRODIGI_API_KEY,
      PRODIGI_API_BASE: process.env.PRODIGI_API_BASE ?? null,
    },
  };
  const wasm = path.join(process.cwd(), "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm");
  report.wasmPresent = fs.existsSync(wasm);
  const steps: Record<string, string> = {};
  const step = async (name: string, fn: () => Promise<unknown> | unknown) => {
    try {
      const r = await fn();
      steps[name] = typeof r === "string" ? r : "ok";
    } catch (e) {
      steps[name] = `ERROR: ${(e as Error).stack ?? String(e)}`.slice(0, 1500);
    }
  };
  await step("fonts", async () => {
    const { getFonts } = await import("@/lib/fonts");
    return `glyphs=${getFonts().medium.numGlyphs}`;
  });
  await step("render", async () => {
    const { buildDesignSVG } = await import("@/lib/render");
    const { DEFAULT_DESIGN } = await import("@/lib/design");
    return `svg=${buildDesignSVG(DEFAULT_DESIGN).length}b`;
  });
  await step("raster", async () => {
    const { svgToPng } = await import("@/lib/raster");
    const png = await svgToPng(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="red"/></svg>`);
    return `png=${png.length}b`;
  });
  await step("stripe", async () => {
    const { stripe } = await import("@/lib/stripe");
    stripe();
  });
  report.steps = steps;
  const ok = Object.values(steps).every((v) => !v.startsWith("ERROR"));
  return NextResponse.json({ ok, ...report }, { status: ok ? 200 : 500 });
}
