import Store from './store';
export default function Page(){return <Store sandbox={process.env.SHOP_MODE !== 'live'}/>}
