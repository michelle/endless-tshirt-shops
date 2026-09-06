import test from 'node:test';
import assert from 'node:assert/strict';
import {cartSchema,total,SKU} from '../lib/catalog';
import {printItems,requireTestMode} from '../lib/server';
test('server rejects price injection, unknown designs, bad sizes and excessive quantities',()=>{
 for(const item of [{id:'orbit',size:'m',quantity:1,price:1},{id:'fake',size:'m',quantity:1},{id:'orbit',size:'xxs',quantity:1},{id:'orbit',size:'m',quantity:-1},{id:'orbit',size:'m',quantity:1.5},{id:'orbit',size:'m',quantity:6}])assert.equal(cartSchema.safeParse([item]).success,false);
 assert.equal(cartSchema.safeParse([]).success,false);
 assert.equal(cartSchema.safeParse([{id:'orbit',size:'m',quantity:1},{id:'orbit',size:'m',quantity:1}]).success,false);
});
test('price and flat shipping are calculated from catalog',()=>{assert.equal(total([{id:'orbit',size:'m',quantity:2},{id:'phase',size:'s',quantity:1}]),10200);});
test('print orders match selected variants and immutable artwork URLs',()=>{process.env.STORE_URL='https://example.com';const [item]=printItems([{id:'pluto',size:'2xl',quantity:2}]);assert.equal(item.sku,SKU);assert.deepEqual(item.attributes,{color:'black',size:'2xl'});assert.equal(item.copies,2);assert.equal(item.assets[0].url,'https://example.com/artwork/pluto-v1.png');assert.equal(item.assets[0].printArea,'front');assert.equal(item.sizing,'fitPrintArea');});
test('live keys or mode cannot accidentally trigger sandbox fulfillment',()=>{process.env.STORE_MODE='live';process.env.STRIPE_SECRET_KEY='sk_live_example';assert.throws(requireTestMode);process.env.STORE_MODE='test';assert.throws(requireTestMode);process.env.STRIPE_SECRET_KEY='rkcs_test_example';assert.doesNotThrow(requireTestMode);});
import type Stripe from 'stripe';
import {paidOrder} from '../lib/fulfillment';
const paid={id:'cs_test_example',status:'complete',livemode:false,payment_status:'paid',currency:'usd',amount_total:3800,metadata:{store:'night-shift-v1',cart:JSON.stringify([{id:'orbit',size:'m',quantity:1}])},collected_information:{shipping_details:{name:'Test Buyer',address:{line1:'123 Test Street',line2:null,city:'New York',postal_code:'10001',state:'NY',country:'US'}}},customer_details:{email:'test@example.com'}} as unknown as Stripe.Checkout.Session;
test('only completed, paid, matching test orders can be printed',()=>{
 for(const override of [{payment_status:'unpaid'},{status:'open'},{livemode:true},{amount_total:1},{currency:'eur'},{metadata:{store:'other',cart:paid.metadata!.cart}},{collected_information:null}])assert.throws(()=>paidOrder({...paid,...override} as Stripe.Checkout.Session));
 const order=paidOrder(paid);assert.equal(order.recipient.address.countryCode,'US');assert.equal(order.recipient.email,'test@example.com');assert.equal(order.items[0].id,'orbit');
});
test('fulfillment idempotency is stable for retries and unique per checkout',()=>{assert.equal(paidOrder(paid).idempotencyKey,paidOrder(paid).idempotencyKey);assert.notEqual(paidOrder(paid).idempotencyKey,paidOrder({...paid,id:'cs_test_another'}).idempotencyKey);});
test('earlier checkouts keep their original print revision',()=>{process.env.STORE_URL='https://example.com';const items=[{id:'phase',size:'s',quantity:1}] as const;assert.ok(printItems([...items],'v1')[0].assets[0].url.endsWith('phase-v1.png'));assert.ok(printItems([...items],'v2')[0].assets[0].url.endsWith('phase-v2.png'));});
