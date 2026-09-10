import "../success.css";

export default async function Success({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) { const { session_id } = await searchParams; return <main className="success"><div><p className="eyebrow">ORDER RECEIVED</p><h1>Your legend is<br /><em>in motion.</em></h1><p>Thanks for making a Futurefolk original. Payment is confirmed and your custom DTG print is being released to production.</p>{session_id && <p className="order-id">ORDER REF · {session_id}</p>}<a href="/">Create another legend →</a></div></main>; }
