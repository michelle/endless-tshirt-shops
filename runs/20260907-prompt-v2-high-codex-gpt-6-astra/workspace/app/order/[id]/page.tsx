import Receipt from './receipt';
export const metadata={title:'Your test order',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){return <Receipt id={(await params).id}/>}
