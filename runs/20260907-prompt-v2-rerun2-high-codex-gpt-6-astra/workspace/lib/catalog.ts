export const products = [
 { id: 'rain-check', name: 'A Little Rain', subtitle: 'For the beautifully underprepared.', price: 3200, art: '/art/rain.png', color: 'black', ink: 'Warm ivory + trail orange', edition: '01', description: 'A little rain. A good excuse. An original woodcut-inspired print for anyone who considers a questionable forecast an invitation.' },
 { id: 'cloud-watcher', name: 'Head in the Clouds', subtitle: 'A perfectly good place to be.', price: 3200, art: '/art/clouds.png', color: 'navy blue', ink: 'Warm ivory + sky blue', edition: '02', description: 'Eyes up. Pace down. A mountain-and-cloud print for the scenic-route takers, daydreamers, and amateur sky appreciators.' },
] as const;
export const sizes = ['s', 'm', 'l', 'xl', '2xl'] as const;
export const countries = [{code:'US',name:'United States'},{code:'GB',name:'United Kingdom'},{code:'CA',name:'Canada'},{code:'AU',name:'Australia'}];
export type CartItem = { productId: string; size: string; quantity: number };
export const money = (cents:number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
export const productFor = (id:string) => products.find(p=>p.id===id);
