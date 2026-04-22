/** Compare two calendar-month bucket counts for a compact trend label. */
export function monthBucketTrend(current: number, previous: number): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (current === 0 && previous === 0) return { pct: 0, direction: 'flat' }
  if (previous === 0) return { pct: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'flat' }
  const raw = Math.round(((current - previous) / previous) * 100)
  if (raw === 0) return { pct: 0, direction: 'flat' }
  return { pct: Math.abs(raw), direction: raw > 0 ? 'up' : 'down' }
}

export function calendarMonthKeys(reference = new Date()) {
  const cur = new Date(reference.getFullYear(), reference.getMonth(), 1)
  const prev = new Date(reference.getFullYear(), reference.getMonth() - 1, 1)
  const curKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
  const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
  return { curKey, prevKey }
}

export function isoMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
