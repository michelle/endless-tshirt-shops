export const SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'] as const;

export type ProductId = 'moon-orchard' | 'cloud-library' | 'night-swimming';

export type Product = {
  id: ProductId;
  name: string;
  note: string;
  description: string;
  price: number;
  displayPrice: string;
  color: string;
  prodigiColor: string;
  position: string;
  art: string;
  accent: string;
};

export const PRODUCTS: Product[] = [
  {
    id: 'moon-orchard', name: 'Moon Orchard', note: 'Field Note № 01', price: 34, displayPrice: '$34',
    color: 'French Navy', prodigiColor: 'french navy', position: 'left center', art: '/art/moon-orchard.png', accent: '#ff9b72',
    description: 'For the hillside where the moon ripens once a year. Peach and silver ink on deep navy.',
  },
  {
    id: 'cloud-library', name: 'Cloud Library', note: 'Field Note № 02', price: 34, displayPrice: '$34',
    color: 'Vintage White', prodigiColor: 'vintage white', position: 'center center', art: '/art/cloud-library.png', accent: '#135be8',
    description: 'For the stacks where every borrowed story changes the weather. Cobalt ink on vintage white.',
  },
  {
    id: 'night-swimming', name: 'Night Swimming', note: 'Field Note № 03', price: 36, displayPrice: '$36',
    color: 'Black', prodigiColor: 'black', position: 'right center', art: '/art/night-swimming.png', accent: '#78eafa',
    description: 'For the pool that only appears after midnight. Electric cyan and acid lime on washed black.',
  },
];

export const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map((product) => [product.id, product])) as Record<ProductId, Product>;
export const PRODIGI_SKU = 'TEE-SS-STTU755';
