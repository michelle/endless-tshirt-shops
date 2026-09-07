export const products = [
  {id:'long-way', name:'Take the Long Way', kicker:'FOR THE SCENIC ROUTE', description:'A winding road, a setting sun, and absolutely no rush. A little reminder that the best part of getting there is everything in between.', color:'#ddd4bb', price:3400, art:'/art/long-way.png', number:'01'},
  {id:'no-signal', name:'No Signal, No Problem', kicker:'LESS SCROLL. MORE SOUL.', description:'Trade full bars for tall pines. A lakeside escape for anyone who thinks the best connection happens somewhere off the grid.', color:'#bac5b5', price:3400, art:'/art/no-signal.png', number:'02'},
  {id:'unavailable', name:'Currently Unavailable', kicker:'PLEASE TRY THE MOUNTAINS', description:'Your new favorite automatic reply. A sun-soaked campsite for the days you put your phone away and let the world wait.', color:'#d6bda8', price:3400, art:'/art/unavailable.png', number:'03'},
] as const;
export const sizes=['s','m','l','xl','2xl'] as const;
export type Size=typeof sizes[number];
export type CartItem={id:string;size:Size;quantity:number};
export const money=(cents:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
export const findProduct=(id:string)=>products.find(p=>p.id===id);
export const states='AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
export function normalizeCart(value:unknown):CartItem[]{
 if(!Array.isArray(value)||!value.length||value.length>15)throw new Error('Add between 1 and 15 items to your bag.');
 const merged=new Map<string,CartItem>();
 for(const raw of value){if(!raw||!findProduct(raw.id)||!sizes.includes(raw.size)||!Number.isInteger(raw.quantity)||raw.quantity<1||raw.quantity>10)throw new Error('Choose a valid shirt, size, and quantity (1–10).');const key=raw.id+':'+raw.size;const quantity=(merged.get(key)?.quantity||0)+raw.quantity;if(quantity>10)throw new Error('Maximum 10 of each shirt and size.');merged.set(key,{id:raw.id,size:raw.size,quantity});}
 const cart=[...merged.values()].sort((a,b)=>(a.id+a.size).localeCompare(b.id+b.size));if(cart.reduce((n,i)=>n+i.quantity,0)>20)throw new Error('Maximum 20 shirts per test order.');return cart;
}
export const subtotal=(cart:CartItem[])=>cart.reduce((sum,i)=>sum+findProduct(i.id)!.price*i.quantity,0);
