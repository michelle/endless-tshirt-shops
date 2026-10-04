'use client'

import { useEffect, useMemo, useState } from 'react'
import { zonedTimeToUtc } from '@/lib/sky/astro'
import { buildChart } from '@/lib/sky/chart'
import { renderDesignSVG } from '@/lib/sky/svg'
import { validateSpec } from '@/lib/spec'

/**
 * Renders one finished design (chart + typography) as a responsive inline SVG.
 * Re-renders once webfonts finish loading so the preview matches the print file.
 */
export default function SkyChart({ spec, className }) {
  const [fontsReady, setFontsReady] = useState(false)
  const valid = useMemo(() => validateSpec(spec), [spec])

  useEffect(() => {
    let cancelled = false
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => {
        if (!cancelled) setFontsReady(true)
      })
    }
    return () => {
      cancelled = true
    }
  }, [])

  const html = useMemo(() => {
    if (!valid) return null
    try {
      const date = zonedTimeToUtc(valid.d, valid.tm, valid.tz)
      const chart = buildChart(date, valid.la, valid.lo, { magLimit: 5.05 })
      return renderDesignSVG(valid, chart)
    } catch {
      return null
    }
    // fontsReady only forces a recompute after webfonts load
  }, [valid, fontsReady])

  if (!html) return null
  return (
    <div
      className={className ? `skychart ${className}` : 'skychart'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/** Chart stats for the facts strip (rendered alongside the preview). */
export function useChartStats(spec) {
  const valid = useMemo(() => validateSpec(spec), [spec])
  return useMemo(() => {
    if (!valid) return null
    try {
      const date = zonedTimeToUtc(valid.d, valid.tm, valid.tz)
      const chart = buildChart(date, valid.la, valid.lo, { magLimit: 5.05 })
      return chart.stats
    } catch {
      return null
    }
  }, [valid])
}
