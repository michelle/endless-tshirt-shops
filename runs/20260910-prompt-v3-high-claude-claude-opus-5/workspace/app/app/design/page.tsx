import type { Metadata } from 'next';
import Studio from './Studio';
import { decodeDesign, DEFAULT_DESIGN, type Design } from '@/lib/design';

export const metadata: Metadata = {
  title: 'Collect a specimen — Flora Personalis',
  description: 'Name, date, place. Watch the plant grow, then have it pressed onto a shirt.',
};

export const dynamic = 'force-dynamic';

export default async function DesignPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; cancelled?: string }>;
}) {
  const params = await searchParams;
  const initial: Design = (params.d && decodeDesign(params.d)) || DEFAULT_DESIGN;

  return (
    <>
      {params.cancelled && (
        <div className="wrap" style={{ paddingTop: 24 }}>
          <div className="notice">
            Checkout was cancelled — nothing was charged, and your specimen is exactly as you left it.
          </div>
        </div>
      )}
      <Studio initial={initial} />
    </>
  );
}
