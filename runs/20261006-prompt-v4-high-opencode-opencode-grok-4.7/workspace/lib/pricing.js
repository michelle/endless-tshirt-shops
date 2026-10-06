/** Retail from a Prodigi wholesale quote. Recomputed on the server at checkout. */

export function retailGarment(wholesaleAmount) {
  const wholesale = Number(wholesaleAmount)
  const extra = Math.max(0, wholesale - 12.5)
  const price = 46 + extra * 2
  return Math.round(price)
}

export function retailShipping(wholesaleAmount) {
  const wholesale = Number(wholesaleAmount)
  const price = wholesale * 1.5 + 2
  return Math.max(6.95, Math.round(price * 100) / 100)
}

export function toCents(amount) {
  return Math.round(Number(amount) * 100)
}
