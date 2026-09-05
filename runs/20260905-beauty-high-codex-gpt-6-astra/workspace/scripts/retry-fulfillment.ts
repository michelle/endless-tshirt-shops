import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
async function main() {
  const { fulfillCheckout } = await import("../lib/fulfillment");
  const sessionId = process.argv[2];
  if (!sessionId?.startsWith("cs_"))
    throw new Error("Usage: npx tsx scripts/retry-fulfillment.ts cs_test_...");
  console.log("Print order:", await fulfillCheckout(sessionId));
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
