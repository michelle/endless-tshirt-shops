import type {Metadata} from 'next';
import OrderStatus from './status';
export const metadata:Metadata={title:'Your captured moment — datetime.store',description:'Private order status.',robots:{index:false,follow:false},referrer:'no-referrer',openGraph:{title:'Your captured moment',description:'Private order status.',images:[]},twitter:{title:'Your captured moment',description:'Private order status.',images:[]}};
export default function Page(){return <OrderStatus/>}
