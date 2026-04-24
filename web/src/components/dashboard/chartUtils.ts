import { DASHBOARD_CHART_COLORS } from './constants'
import { formatDashboardLabel } from './formatters'
import type { DashboardSlice } from './types'

export function makeDashboardSlices(entries: Array<[string, number]>): DashboardSlice[] {
  return entries
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({
      key: label,
      label: formatDashboardLabel(label),
      value,
      color: DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
    }))
}

/** Compare counts in last `windowDays` vs the prior window of equal length; returns signed % change for display */
export function trendPercentBetweenWindows(
  items: { at: string }[],
  windowDays: number,
): { pct: number; direction: 'up' | 'down' | 'flat' } {
  const now = Date.now()
  const msDay = 86400000
  const w = windowDays * msDay
  const curStart = now - w
  const prevStart = now - 2 * w
  let cur = 0
  let prev = 0
  for (const { at } of items) {
    const t = new Date(at).getTime()
    if (t >= curStart && t <= now) cur += 1
    else if (t >= prevStart && t < curStart) prev += 1
  }
  if (prev === 0 && cur === 0) return { pct: 0, direction: 'flat' }
  if (prev === 0) return { pct: cur > 0 ? 100 : 0, direction: cur > 0 ? 'up' : 'flat' }
  const raw = Math.round(((cur - prev) / prev) * 100)
  return {
    pct: Math.min(999, Math.abs(raw)),
    direction: raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat',
  }
}
