import {notFound} from 'next/navigation';
import {findProduct,products} from '@/lib/catalog';
import ProductDetail from './product-detail';
export function generateStaticParams(){return products.map(p=>({slug:p.id}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const p=findProduct((await params).slug);return {title:p?.name||'Shirt not found',description:p?.description}}
export default async function Page({params}:{params:Promise<{slug:string}>}){const p=findProduct((await params).slug);if(!p)notFound();return <ProductDetail id={p.id}/>}
