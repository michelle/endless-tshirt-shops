'use strict';
const prodigi = require('./prodigi');
const { renderPrintPng } = require('./design/print');
const { tag } = require('./sign');

// The single entry point that sends shirts to print. Callers must have confirmed payment first.
async function fulfill(order, payment) {
  for (const it of order.items) await renderPrintPng(it.d, it.c);
  const p = await prodigi.submitOrder(order);
  console.log(JSON.stringify({ evt: 'fulfilled', order: order.id, prodigi: p.id, payment }));
  return { prodigiOrderId: p.id, statusToken: tag(order.id) };
}

module.exports = { fulfill };
