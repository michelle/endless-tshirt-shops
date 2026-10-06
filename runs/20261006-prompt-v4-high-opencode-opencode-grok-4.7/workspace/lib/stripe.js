import Stripe from "stripe"

let client

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    const error = new Error("Stripe is not configured")
    error.status = 503
    throw error
  }
  if (!client) client = new Stripe(key)
  return client
}
