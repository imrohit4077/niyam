export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function formatDateTimeShort(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatRelativeTime(value: string) {
  const d = new Date(value)
  const now = Date.now()
  const diffMs = now - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const MS_DAY = 86400000

export type PeriodTrend = {
  current: number
  previous: number
  delta: number
  percent: number | null
}

/** Compare counts in [now-30d, now) vs [now-60d, now-30d). */
export function trendForDateRange<T>(items: T[], getTime: (item: T) => number | null): PeriodTrend {
  const now = Date.now()
  const curStart = now - 30 * MS_DAY
  const prevStart = now - 60 * MS_DAY
  let current = 0
  let previous = 0
  for (const item of items) {
    const t = getTime(item)
    if (t == null || Number.isNaN(t)) continue
    if (t >= curStart && t < now) current += 1
    else if (t >= prevStart && t < curStart) previous += 1
  }
  const delta = current - previous
  const percent = previous > 0 ? Math.round((delta / previous) * 100) : current > 0 ? 100 : null
  return { current, previous, delta, percent }
}

export function trendLabel(trend: PeriodTrend): { arrow: '↑' | '↓' | '—'; text: string; positive: boolean } {
  if (trend.current === 0 && trend.previous === 0) {
    return { arrow: '—', text: '0%', positive: true }
  }
  if (trend.percent == null) {
    if (trend.delta === 0) return { arrow: '—', text: '0%', positive: true }
    return { arrow: trend.delta > 0 ? '↑' : '↓', text: 'New', positive: trend.delta >= 0 }
  }
  const arrow = trend.percent > 0 ? '↑' : trend.percent < 0 ? '↓' : '—'
  const text = `${trend.percent > 0 ? '+' : ''}${trend.percent}%`
  return { arrow, text, positive: trend.percent >= 0 }
}

export const PIPELINE_FUNNEL_STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'screening', label: 'Screening' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'hired', label: 'Hired' },
] as const

export function funnelCountsFromStatuses(statusCounts: Record<string, number>): number[] {
  return PIPELINE_FUNNEL_STAGES.map(s => statusCounts[s.key] ?? 0)
}
