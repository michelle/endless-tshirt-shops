const { json, validOptions, createDesign } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  try {
    const { style, size, artwork } = req.body || {};
    if (!validOptions(style, size)) return json(res, 400, { error: 'Please choose a valid fit and size.' });
    if (typeof artwork !== 'string' || !/^data:image\/png;base64,/.test(artwork) || artwork.length > 1000000) return json(res, 400, { error: 'The shirt artwork was invalid. Please try again.' });
    const designId = await createDesign(artwork);
    return json(res, 200, { designId });
  } catch (error) {
    console.error('[prepare-order]', error);
    return json(res, error.statusCode && error.statusCode < 500 ? 502 : 500, { error: error.message || 'We could not prepare your shirt.' });
  }
};
