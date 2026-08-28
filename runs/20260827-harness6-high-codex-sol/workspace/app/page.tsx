import Shop from "./shop";

export const dynamic = "force-dynamic";

export default function Home() {
  return <Shop initialTimestamp={Date.now()} sandbox={process.env.NEXT_PUBLIC_SHOP_MODE !== "live"} />;
}
