export const sizes = ['S', 'M', 'L', 'XL', '2XL'] as const;
export type Size = typeof sizes[number];
export const products = [
 {id:'long-way',name:'Take the Long Way',subtitle:'For the scenic-route regulars.',category:'THE WANDERER',number:'01',price:3400,art:'/art/long-way.png',description:'A little reminder that the best way home is rarely the fastest. Mountain lines, a winding trail, and a rust-orange sun, in an original two-tone field print.',story:'For wrong turns that turn out right. For the trail you have never taken. For the long way home.'},
 {id:'bird-club',name:'Less Scrolling, More Soaring',subtitle:'Look up. There’s a whole world out there.',category:'THE DAYDREAMER',number:'02',price:3400,art:'/art/bird-club.png',description:'Trade your feed for a field guide. An original birdwatching illustration in forest green and rust, made for slow mornings and wonderfully unproductive afternoons.',story:'A membership card for the look-up club. No app, no algorithm, just a very good bird.'},
] as const;
export type Product = typeof products[number];
export type CartItem = {productId:string;size:Size;quantity:number};
export const getProduct = (id:string) => products.find(p=>p.id===id);
export const money = (cents:number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
export const subtotal = (items:CartItem[]) => items.reduce((sum,i)=>sum+(getProduct(i.productId)?.price??0)*i.quantity,0);
