export type ProductId = 'moon-garden' | 'low-tide' | 'meteor-watch';

export const PRODUCTS = [
  { id: 'moon-garden' as ProductId, name: 'Moon Garden', field: 'Field Note 01 · Actias luna', price: 34, image: '/designs/luna-moth.png', asset: '/designs/luna-moth.png', tone: 'moth', defaultColor: 'black', story: 'A soft-winged orbit through moonflowers and late-summer light.' },
  { id: 'low-tide' as ProductId, name: 'Low Tide / High Moon', field: 'Field Note 02 · Octopus vulgaris', price: 36, image: '/designs/tidepool.png', asset: '/designs/tidepool.png', tone: 'tide', defaultColor: 'navy blue', story: 'An after-hours tidepool where every small world is still wide awake.' },
  { id: 'meteor-watch' as ProductId, name: 'Meteor Watch', field: 'Field Note 03 · Athene cunicularia', price: 34, image: '/designs/desert-owl.png', asset: '/designs/desert-owl.png', tone: 'owl', defaultColor: 'asphalt', story: 'A patient desert sentinel with the best seat for the night sky.' },
] as const;

export const SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'] as const;
export const COLORS = [
  { value: 'black', label: 'Black', hex: '#161619' },
  { value: 'navy blue', label: 'Navy', hex: '#18243a' },
  { value: 'asphalt', label: 'Asphalt', hex: '#4c4d52' },
  { value: 'army', label: 'Army', hex: '#4f5541' },
] as const;
