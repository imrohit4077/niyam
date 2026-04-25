/** Count items whose ISO date falls in the calendar month (0 = this month, 1 = last month). */
export function countInCalendarMonth<T>(items: T[], getIso: (item: T) => string | null | undefined, monthsAgo: 0 | 1): number {
  const now = new Date()
  const ref = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
  const y = ref.getFullYear()
  const m = ref.getMonth()
  return items.filter(item => {
    const iso = getIso(item)
    if (!iso) return false
    const d = new Date(iso)
    return d.getFullYear() === y && d.getMonth() === m
  }).length
}

export function monthOverMonthPct(current: number, previous: number): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0 && current === 0) return { pct: 0, direction: 'flat' }
  if (previous === 0) return { pct: 100, direction: 'up' }
  const raw = Math.round(((current - previous) / previous) * 100)
  const direction = raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat'
  return { pct: Math.abs(raw), direction }
}
