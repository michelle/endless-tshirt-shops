import { geocode } from '@/lib/geocode'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const q = new URL(request.url).searchParams.get('q') || ''
  try {
    const results = await geocode(q, 8)
    return Response.json({ results })
  } catch (err) {
    console.error('geocode failed', err)
    return Response.json({ results: [], error: 'geocode failed' }, { status: 500 })
  }
}
