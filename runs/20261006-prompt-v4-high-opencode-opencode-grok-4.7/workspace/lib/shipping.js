import { regionsFor } from "./products.js"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function cleanShipping(input) {
  const country = String(input.country || "").toUpperCase()
  return {
    name: String(input.name || "").replace(/\s+/g, " ").trim(),
    line1: String(input.line1 || "").replace(/\s+/g, " ").trim(),
    line2: String(input.line2 || "").replace(/\s+/g, " ").trim(),
    city: String(input.city || "").replace(/\s+/g, " ").trim(),
    state: String(input.state || "").trim(),
    postal: String(input.postal || "").replace(/\s+/g, " ").trim(),
    country,
    method: ["Budget", "Standard", "Express"].includes(input.method) ? input.method : "Standard",
  }
}

export function cleanContact(input) {
  return {
    email: String(input.email || "").trim(),
    phone: String(input.phone || "").trim(),
  }
}

export function shippingErrors(shipping, contact) {
  const errors = []
  if (shipping.name.length < 2) errors.push("Add the recipient's name.")
  if (shipping.line1.length < 3) errors.push("Add a street address.")
  if (shipping.city.length < 2) errors.push("Add a city.")
  if (!/^[A-Z]{2}$/.test(shipping.country)) errors.push("Choose a country.")
  const regions = regionsFor(shipping.country)
  if (regions && !regions.some(([code, name]) => code === shipping.state || name === shipping.state)) {
    errors.push("Choose a state or province.")
  }
  if (shipping.postal.length < 3) errors.push("Add a postal code.")
  if (!EMAIL.test(contact.email)) errors.push("Add an email for the receipt.")
  const digits = contact.phone.replace(/\D/g, "")
  if (digits.length < 7) errors.push("Add a phone number. Couriers ask for one.")
  return errors
}
