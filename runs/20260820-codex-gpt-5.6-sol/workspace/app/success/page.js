import { Suspense } from 'react';
import Success from '@/components/Success';
export const metadata = { title: 'Your moment is yours — datetime.store' };
export default function SuccessPage() { return <Suspense fallback={null}><Success /></Suspense>; }
