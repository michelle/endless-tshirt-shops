import { Store } from "@/components/Store";
import { chivo } from "./fonts";
import { SHIPPING_COUNTRIES } from "@/lib/products";

export default function Page() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  return (
    <main className="container">
      <header className="page-header">
        <h1>datetime.store</h1>
        <h2>
          we sell a t-shirt with the current datetime.{" "}
          <span role="img" aria-label="stopwatch">
            ⏱
          </span>
        </h2>
      </header>

      <Store publishableKey={publishableKey} shirtFontFamily={chivo.style.fontFamily} />

      <footer>
        <span>Each shirt is printed on demand with the exact millisecond you bought it.</span>
        <span>Ships free to the {SHIPPING_COUNTRIES.join(", ")}. Printed and shipped by Prodigi.</span>
      </footer>
    </main>
  );
}
