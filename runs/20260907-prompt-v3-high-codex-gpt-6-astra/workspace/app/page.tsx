import Store from '@/components/store';
export default function Home() { return <Store testMode={process.env.PAYMENTS_MODE !== 'live'} />; }
