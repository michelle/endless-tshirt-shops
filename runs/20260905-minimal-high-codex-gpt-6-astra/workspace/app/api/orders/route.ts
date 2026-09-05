import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { authorizeSession, fulfill, summarize } from "@/lib/orders";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
  throttle,
} from "@/lib/security";
export const runtime = "nodejs";
export const maxDuration = 60;
const schema = z
  .object({
    sessionId: z
      .string()
      .regex(/^cs_(test|live)_[a-zA-Z0-9]+$/)
      .max(200),
    token: z.string().regex(/^[\w-]{43}$/),
  })
  .strict();
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    throttle(request, "orders", 30);
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success)
      throw new HttpError(
        400,
        "This order link is incomplete. Please use the link from checkout.",
      );
    const { sessionId, token } = parsed.data;
    const s = await stripe()
      .checkout.sessions.retrieve(sessionId)
      .catch(() => {
        throw new HttpError(404, "Order not found.");
      });
    authorizeSession(s, token);
    let order = null;
    try {
      order = await fulfill(sessionId);
    } catch {
      /* Paid status remains visible while Stripe retries fulfillment. */
    }
    return Response.json(summarize(s, order), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(
      error,
      "We could not refresh your order. Please try again shortly.",
    );
  }
}
