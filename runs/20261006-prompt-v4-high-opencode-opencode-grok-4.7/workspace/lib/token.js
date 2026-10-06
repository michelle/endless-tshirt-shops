import crypto from "crypto"
import { artSpec, specFromArt, specErrors } from "./spec.js"

function secret() {
  const value = process.env.ART_SECRET || process.env.STRIPE_SECRET_KEY
  if (!value) throw new Error("ART_SECRET is not set")
  return value
}

export function signArt(spec) {
  const payload = Buffer.from(JSON.stringify(artSpec(spec))).toString("base64url")
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("base64url")
  return `${payload}.${sig}`
}

export function readToken(token) {
  if (!token || typeof token !== "string" || token.length > 2000) return null
  const dot = token.lastIndexOf(".")
  if (dot < 10) return null
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("base64url")
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  let art
  try {
    art = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
  } catch {
    return null
  }
  const spec = specFromArt(art)
  const errors = specErrors(spec).filter((e) => !e.startsWith("Choose a size"))
  if (errors.length) return null
  return spec
}
