import {OrderView} from '@/components/order';
export const metadata={title:'Your test order'};
export default async function Page({params}:{params:Promise<{id:string}>}){return <OrderView id={(await params).id}/>}
