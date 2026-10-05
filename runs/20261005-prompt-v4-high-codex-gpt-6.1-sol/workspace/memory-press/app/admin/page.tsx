import {env} from 'cloudflare:workers';
import {requireChatGPTUser} from '@/app/chatgpt-auth';
import AdminOrders from './orders';
export const dynamic='force-dynamic';
export default async function AdminPage(){
 const user=await requireChatGPTUser('/admin');
 if(!env.OWNER_EMAIL||user.email!==env.OWNER_EMAIL)return <main className="order-page"><h1>Owner access required</h1><p>This page is reserved for the store owner.</p><a href="/">Return to the store</a></main>;
 return <AdminOrders/>;
}
