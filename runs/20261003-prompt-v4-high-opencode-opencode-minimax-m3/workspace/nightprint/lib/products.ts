/**
 * STARPRINT product catalog.
 *
 * Maps the customer-facing choices (color / size) to the canonical
 * Prodigi SKU so we can build orders consistently.
 */

export type GarmentColor =
  | 'white' | 'black' | 'navy' | 'sand' | 'olive';

export type GarmentSize =
  | 'xs' | 's' | 'm' | 'l' | 'xl' | '2xl';

export const COLORS: Array<{ value: GarmentColor; label: string; hex: string; prodigiName: string }> = [
  { value: 'white',  label: 'Optic White',   hex: '#f5f3ec', prodigiName: 'white' },
  { value: 'black',  label: 'Satin Black',   hex: '#191a1d', prodigiName: 'black' },
  { value: 'navy',   label: 'Deep Navy',     hex: '#1d2a3f', prodigiName: 'navy blue' },
  { value: 'sand',   label: 'Desert Sand',   hex: '#d2bf9e', prodigiName: 'cream' },
  { value: 'olive',  label: 'Mountain Olive',hex: '#4a573c', prodigiName: 'military green' },
];

export const SIZES: Array<{ value: GarmentSize; label: string; chestIn: string }> = [
  { value: 'xs',  label: 'X-Small',  chestIn: '32\u201334' },
  { value: 's',   label: 'Small',    chestIn: '34\u201337' },
  { value: 'm',   label: 'Medium',   chestIn: '38\u201341' },
  { value: 'l',   label: 'Large',    chestIn: '42\u201345' },
  { value: 'xl',  label: 'X-Large',  chestIn: '46\u201349' },
  { value: '2xl', label: 'XX-Large', chestIn: '50\u201353' },
];

export interface Product {
  sku: string;
  brand: string;
  name: string;
  description: string;
  materials: string;
  printResolution: { width: number; height: number };
  baseCostUsd: number;        // wholesale cost on Prodigi (~£8 / ~$10)
  retailUsd: number;          // what we charge the customer
}

export const PRODUCTS: Product[] = [
  {
    sku: 'GLOBAL-TEE-BC-3001',
    brand: 'Bella + Canvas',
    name: '3001 Classic Crew',
    description:
      'Our flagship shirt. Tailored fit, 100% combed ring-spun cotton, DTG-ready with vibrant color reproduction. Built for daily wear.',
    materials: '100% combed ring-spun cotton, 4.2 oz, pre-shrunk',
    printResolution: { width: 4677, height: 5881 },
    baseCostUsd: 10.00,
    retailUsd: 36.00,
  },
];

export function findProduct(sku: string): Product | undefined {
  return PRODUCTS.find((p) => p.sku === sku);
}

export function defaultSku(): string {
  return PRODUCTS[0].sku;
}

export function formatPrice(usd: number): string {
  return `$${usd.toFixed(2)}`;
}
