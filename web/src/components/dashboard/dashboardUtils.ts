export function formatDashboardLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
}

export function pctChange(current: number, previous: number): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0 && current === 0) return { pct: 0, direction: 'flat' }
  if (previous === 0) return { pct: 100, direction: 'up' }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw * 10) / 10
  if (rounded > 0) return { pct: rounded, direction: 'up' }
  if (rounded < 0) return { pct: Math.abs(rounded), direction: 'down' }
  return { pct: 0, direction: 'flat' }
}

export function monthBucket(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function isInMonth(iso: string, year: number, monthIndex0: number) {
  const d = new Date(iso)
  return d.getFullYear() === year && d.getMonth() === monthIndex0
}
