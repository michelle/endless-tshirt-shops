import SuccessApp from '@/components/SuccessApp';
import { paymentMode } from '@/lib/payments';

export const dynamic = 'force-dynamic';

export default function SuccessPage({ searchParams }) {
  const ref = searchParams.ref || '';
  if (!ref) {
    return (
      <div className="page">
        <h1>Missing order reference</h1>
        <p className="lead">This page is shown after checkout completes.</p>
        <a className="btn" href="/">Back to the store</a>
      </div>
    );
  }
  return <SuccessApp mode={paymentMode()} refId={ref} />;
}
