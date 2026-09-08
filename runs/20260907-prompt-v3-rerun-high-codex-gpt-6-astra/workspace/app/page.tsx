import Store from "./store";
import { mode } from "@/lib/config";
export const dynamic = "force-dynamic";
export default function Home() {
  return (
    <Store
      testMode={mode() === "test"}
      checkoutReady={
        !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET)
      }
    />
  );
}
