/** Calendar month key `YYYY-MM` in local time. */
export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function isInMonth(iso: string, year: number, monthIndex0: number) {
  const d = new Date(iso)
  return d.getFullYear() === year && d.getMonth() === monthIndex0
}

export type MonthPair = { current: { y: number; m: number }; previous: { y: number; m: number } }

export function currentPreviousMonth(now = new Date()): MonthPair {
  const cur = { y: now.getFullYear(), m: now.getMonth() }
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return { current: cur, previous: { y: prevDate.getFullYear(), m: prevDate.getMonth() } }
}

export function countByMonth<T>(items: T[], getIso: (item: T) => string | null, pair: MonthPair) {
  let cur = 0
  let prev = 0
  for (const item of items) {
    const iso = getIso(item)
    if (!iso) continue
    if (isInMonth(iso, pair.current.y, pair.current.m)) cur += 1
    else if (isInMonth(iso, pair.previous.y, pair.previous.m)) prev += 1
  }
  return { current: cur, previous: prev }
}

export function percentChange(prev: number, cur: number): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (prev === 0 && cur === 0) return { pct: 0, direction: 'flat' }
  if (prev === 0) return { pct: 100, direction: 'up' }
  const raw = Math.round(((cur - prev) / prev) * 100)
  if (raw > 0) return { pct: raw, direction: 'up' }
  if (raw < 0) return { pct: Math.abs(raw), direction: 'down' }
  return { pct: 0, direction: 'flat' }
}
