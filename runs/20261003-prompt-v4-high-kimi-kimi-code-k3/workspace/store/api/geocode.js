// GET /api/geocode?q=paris — city search proxy (OpenStreetMap Nominatim)
module.exports = async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    const q = String(u.searchParams.get('q') || '').trim();
    if (q.length < 2) {
      res.status(200).json({ results: [] });
      return;
    }
    const upstream = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&q=${encodeURIComponent(q)}`;
    const r = await fetch(upstream, {
      headers: { 'User-Agent': 'under-this-sky-store/1.0 (star map t-shirt demo)' },
    });
    const data = await r.json();
    const results = data.map((p) => ({
      label: p.display_name.split(',').slice(0, 3).join(','),
      lat: Number(p.lat),
      lon: Number(p.lon),
    }));
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).json({ results });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
