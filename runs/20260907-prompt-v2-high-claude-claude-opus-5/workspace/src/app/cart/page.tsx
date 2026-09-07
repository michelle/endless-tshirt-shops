import CartView from './CartView';
export const metadata = { title: 'Cart — Last Shift' };
export default function CartPage() {
  return (
    <div className="wrap" style={{ padding: '48px 0 80px', maxWidth: 860 }}>
      <div className="eyebrow">Your order</div>
      <h1 className="serif" style={{ fontSize: 'clamp(30px,4.6vw,44px)', margin: '8px 0 26px' }}>Cart</h1>
      <CartView />
    </div>
  );
}
