import Stripe from 'stripe'

let stripeClient = null

export function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
    stripeClient = new Stripe(key)
  }
  return stripeClient
}

export const stripe = new Proxy({}, {
  get(_t, prop) {
    const s = getStripe()
    return s[prop]
  },
})
