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

export function formatRelativeDay(value: string | number) {
  const d = new Date(value)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export type TrendResult = {
  /** -1 down, 0 flat, 1 up */
  direction: -1 | 0 | 1
  /** whole-number percent vs prior window, or null if not applicable */
  pct: number | null
}

export function compareWindows(current: number, previous: number): TrendResult {
  if (previous === 0 && current === 0) return { direction: 0, pct: null }
  if (previous === 0) return { direction: current > 0 ? 1 : 0, pct: null }
  const raw = Math.round(((current - previous) / previous) * 100)
  const direction: -1 | 0 | 1 = raw > 0 ? 1 : raw < 0 ? -1 : 0
  return { direction, pct: raw }
}

export function countInDateRange<T>(rows: T[], getDate: (row: T) => string | null, start: Date, end: Date) {
  let n = 0
  for (const row of rows) {
    const raw = getDate(row)
    if (!raw) continue
    const t = new Date(raw).getTime()
    if (t >= start.getTime() && t < end.getTime()) n += 1
  }
  return n
}

export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

export function makeDashboardSlices(
  entries: Array<[string, number]>,
  colors: readonly string[],
): DashboardSlice[] {
  return entries
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({
      key: label,
      label: formatDashboardLabel(label),
      value,
      color: colors[index % colors.length] ?? '#6b7280',
    }))
}
