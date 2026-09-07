import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {getProduct,products} from '@/lib/catalog';
import {ShirtImage} from '@/components/store';
import {ProductForm} from '@/components/product-form';
export function generateStaticParams(){return products.map(p=>({slug:p.id}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const p=getProduct((await params).slug);return {title:p?.name??'Shirt not found',description:p?.description}}
export default async function ProductPage({params}:{params:Promise<{slug:string}>}){const p=getProduct((await params).slug);if(!p)notFound();return <main id="main" className="page-wrap"><div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><Link href="/#collection">Collection</Link><span>/</span><span>{p.name}</span></div><div className="product-detail"><div><ShirtImage product={p} hero/><p className="small muted" style={{marginTop:12}}>Illustrative mockup. Print color and placement may vary.</p><div className="art-peek"><img src={p.art} alt={`${p.name} print detail`}/><p>{p.story}</p></div></div><ProductForm product={p}/></div></main>}
