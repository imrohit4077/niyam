export type DashboardSlice = {
  key: string
  label: string
  value: number
  color: string
}

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

export function makeDashboardSlices(entries: Array<[string, number]>, colors: string[]) {
  return entries
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({
      key: label,
      label: formatDashboardLabel(label),
      value,
      color: colors[index % colors.length],
    }))
}

/** Count rows whose date field falls in [now - 2*days, now - days) vs [now - days, now) */
export function countInRollingWindows(
  rows: { created_at?: string; updated_at?: string }[],
  field: 'created_at' | 'updated_at',
  days = 30,
): { current: number; previous: number } {
  const now = Date.now()
  const windowMs = days * 86400000
  let current = 0
  let previous = 0
  for (const row of rows) {
    const raw = row[field] ?? row.created_at
    if (!raw) continue
    const t = new Date(raw).getTime()
    if (Number.isNaN(t)) continue
    if (t >= now - windowMs && t < now) current += 1
    else if (t >= now - 2 * windowMs && t < now - windowMs) previous += 1
  }
  return { current, previous }
}

export function trendFromCounts(current: number, previous: number): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0 && current === 0) return { pct: 0, direction: 'flat' }
  if (previous === 0) return { pct: 100, direction: 'up' }
  const raw = ((current - previous) / previous) * 100
  const pct = Math.min(999, Math.round(Math.abs(raw)))
  if (raw > 0.5) return { pct, direction: 'up' }
  if (raw < -0.5) return { pct, direction: 'down' }
  return { pct: 0, direction: 'flat' }
}
