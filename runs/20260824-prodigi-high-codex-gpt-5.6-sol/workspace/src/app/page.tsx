import { Storefront } from "@/components/storefront";
import { getCurrency, getPriceCents } from "@/lib/products";

export default function Home() {
  return <Storefront priceCents={getPriceCents()} currency={getCurrency()} />;
}
