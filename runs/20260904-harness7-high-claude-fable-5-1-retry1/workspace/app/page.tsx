import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Shop from "@/components/Shop";
import { COMPARE_AT_CENTS, CURRENCY, PRICE_CENTS, SHIP_COUNTRIES } from "@/lib/products";
import { prodigiIsSandbox } from "@/lib/prodigi";

export const dynamic = "force-dynamic";

export default function Page() {
  const testMode = prodigiIsSandbox() || !process.env.STRIPE_SECRET_KEY?.startsWith("sk_live");
  return (
    <main className="container">
      <Header />
      <Shop
        priceCents={PRICE_CENTS}
        compareAtCents={COMPARE_AT_CENTS}
        currency={CURRENCY}
        shipCountries={SHIP_COUNTRIES}
        testMode={testMode}
      />
      <Footer testMode={testMode} />
    </main>
  );
}
