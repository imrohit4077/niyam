export const DASHBOARD_CHART_COLORS = ['#0ea5e9', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6']

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

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

export function formatDashboardLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase())
}

export type TrendResult = { pct: number; up: boolean; label: string }

/** Percent change from previous to current period; null when both are zero. */
export function periodTrendPct(current: number, previous: number): TrendResult | null {
  if (current === 0 && previous === 0) return null
  if (previous === 0) {
    return current > 0 ? { pct: 100, up: true, label: 'new' } : { pct: 0, up: false, label: '0%' }
  }
  const raw = Math.round(((current - previous) / previous) * 100)
  return { pct: Math.abs(raw), up: raw >= 0, label: `${raw > 0 ? '+' : ''}${raw}%` }
}

export function trendArrowDisplay(t: TrendResult | null): { arrow: string; text: string } {
  if (!t) return { arrow: '', text: 'vs prior period' }
  if (t.label === 'new') return { arrow: '↑', text: 'new activity' }
  return { arrow: t.up ? '↑' : '↓', text: t.label }
}

export function displayAuditFeedSummary(row: {
  metadata?: Record<string, unknown>
  action?: string | null
}): string {
  const m = row.metadata || {}
  const s = typeof m.summary === 'string' ? m.summary.trim() : ''
  if (s) return s
  return (row.action && String(row.action)) || 'Activity'
}

export function countCreatedInRange<T extends { created_at: string }>(items: T[], startMs: number, endMs: number) {
  return items.filter(i => {
    const t = new Date(i.created_at).getTime()
    return t >= startMs && t < endMs
  }).length
}

export function countUpdatedInRange<T extends { updated_at: string }>(
  items: T[],
  predicate: (item: T) => boolean,
  startMs: number,
  endMs: number,
) {
  return items.filter(i => {
    if (!predicate(i)) return false
    const t = new Date(i.updated_at).getTime()
    return t >= startMs && t < endMs
  }).length
}

export function lastTwoPeriodBounds(daysEach = 30) {
  const end = Date.now()
  const mid = end - daysEach * 86400000
  const start = mid - daysEach * 86400000
  return { curStart: mid, curEnd: end, prevStart: start, prevEnd: mid }
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
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
  } catch {
    return iso
  }
}
