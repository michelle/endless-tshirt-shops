'use strict';
const prodigi = require('./_lib/prodigi');

module.exports = async (req, res) => {
  try {
    const id = (req.query && req.query.id) || '';
    if (!id) return res.status(400).json({ error: 'Missing order id parameter' });
    const data = await prodigi.getOrder(id);
    return res.status(200).json(data);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message, detail: e.prodigi || null });
  }
};
