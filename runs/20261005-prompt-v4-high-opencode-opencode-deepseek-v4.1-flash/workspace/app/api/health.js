'use strict';
const stripe = require('./_lib/stripe');
const prodigi = require('./_lib/prodigi');

module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'under-same-sky',
    time: new Date().toISOString(),
    stripeConfigured: !!stripe.key(),
    prodigiConfigured: !!prodigi.key(),
    prodigiBase: prodigi.base(),
    signingConfigured: !!process.env.ART_SIGNING_SECRET,
  });
};
