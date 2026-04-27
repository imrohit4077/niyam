export const DASHBOARD_CHART_COLORS = [
  '#00b4d8',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6b7280',
  '#8b5cf6',
]

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
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

/** Count items whose date falls in [start, end). */
export function countInRange<T>(items: T[], getTime: (item: T) => number | null, start: Date, end: Date): number {
  const s = start.getTime()
  const e = end.getTime()
  let n = 0
  for (const item of items) {
    const t = getTime(item)
    if (t == null) continue
    if (t >= s && t < e) n += 1
  }
  return n
}

export function monthBounds(offsetFromCurrent: number): { start: Date; end: Date } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() - offsetFromCurrent
  const start = new Date(y, m, 1)
  const end = new Date(y, m + 1, 1)
  return { start, end }
}

/** Percent change; null when not meaningful. */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null
  if (previous === 0) return current > 0 ? 100 : null
  return Math.round(((current - previous) / previous) * 100)
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

export function formatRelativeTime(iso: string) {
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
