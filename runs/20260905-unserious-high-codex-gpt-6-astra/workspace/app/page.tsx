import Store from './store';
export default function Page() { return <Store testMode={process.env.COMMERCE_MODE !== 'live'} />; }
