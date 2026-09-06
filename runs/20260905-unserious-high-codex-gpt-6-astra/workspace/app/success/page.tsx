import { Suspense } from 'react';
import Confirmation from './confirmation';
export default function Page() { return <Suspense fallback={<main className="success-shell"><p>Finding your moment…</p></main>}><Confirmation /></Suspense>; }
