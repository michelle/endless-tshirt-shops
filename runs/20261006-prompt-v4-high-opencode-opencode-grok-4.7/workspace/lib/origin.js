export function publicOrigin(request) {
  const configured = process.env.SITE_URL?.replace(/\/$/, "")
  if (configured && configured.startsWith("https://")) return configured
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
  if (!host) return null
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return null
  const proto = request.headers.get("x-forwarded-proto") || "https"
  return `${proto}://${host}`
}
