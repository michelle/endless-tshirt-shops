export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }
  console.log('Prodigi callback received', JSON.stringify(req.body || {}));
  return res.status(200).json({ ok: true });
}
