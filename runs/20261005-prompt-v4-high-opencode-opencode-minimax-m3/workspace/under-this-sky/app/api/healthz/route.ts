// app/api/healthz/route.ts
import { NextResponse } from "next/server";
import {
  getAppBaseUrl,
  getPaymentClient,
  getProdigi,
  getStorage,
} from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET() {
  const prodigi = (() => {
    try {
      getProdigi({
        PRODIGI_API_KEY: process.env.PRODIGI_API_KEY,
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  })();
  const payment = getPaymentClient(process.env);
  const storage = getStorage();
  const baseUrl = getAppBaseUrl(process.env);

  // Probe Prodigi sandbox by fetching a non-existent order; we expect a
  // 404 EntityNotFound if auth works (vs 401 NotAuthenticated if key bad).
  let probe: { ok: boolean; outcome?: string; error?: string } = { ok: false };
  try {
    const r = await getProdigi({ PRODIGI_API_KEY: process.env.PRODIGI_API_KEY }).getOrder(
      "ord_999999999"
    );
    probe = { ok: true, outcome: r.outcome };
  } catch (e) {
    const err = e as Error & { status?: number; response?: { outcome?: string } };
    probe = {
      // 404 EntityNotFound → auth worked, server just doesn't know about
      // that order id. Anything else is a real failure.
      ok: err.status === 404,
      outcome: err.response?.outcome,
      error: err.message,
    };
  }

  return NextResponse.json({
    now: new Date().toISOString(),
    baseUrl,
    payment: {
      mode: payment.mode,
      hasSecret: !!process.env.STRIPE_SECRET_KEY,
    },
    prodigi: {
      hasKey: !!process.env.PRODIGI_API_KEY,
      ...prodigi,
      probe,
    },
    storage: {
      dataDir: storage.dataDir,
      assetsDir: storage.assetsDir,
    },
  });
}
