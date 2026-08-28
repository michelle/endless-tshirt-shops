"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The Prodigi order is placed by the Stripe webhook a moment after checkout.
// Until it lands, re-render the (server) success page every few seconds.
export default function RefreshUntilFulfilled({
  fulfilled,
}: {
  fulfilled: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (fulfilled) return;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      if (attempts > 10) {
        clearInterval(interval);
        return;
      }
      router.refresh();
    }, 3000);
    return () => clearInterval(interval);
  }, [fulfilled, router]);

  return null;
}
