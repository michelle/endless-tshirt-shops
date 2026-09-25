import CheckoutApp from '@/components/CheckoutApp';
import { paymentMode } from '@/lib/payments';

export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  return <CheckoutApp mode={paymentMode()} />;
}
